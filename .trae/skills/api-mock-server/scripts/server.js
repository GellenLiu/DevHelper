const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const RouteHandler = require('./lib/route-handler');
const SSEHandler = require('./lib/sse-handler');
const DynamicRouter = require('./lib/dynamic-router');
const ConditionMatcher = require('./lib/condition-matcher');
const interfaces = require('./config/interfaces');
const sseInterfaces = require('./config/sse-interfaces');

const PORT = process.env.PORT || 3000;

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  }
  return env;
}

const env = loadEnv();
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';
const ADMIN_ENABLED = ADMIN_PASSWORD.length > 0;

const sessions = new Map();
const SESSION_DURATION = 24 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createSession() {
  const token = generateToken();
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_DURATION) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_DURATION) {
      sessions.delete(token);
    }
  }
}

setInterval(cleanExpiredSessions, 60 * 60 * 1000);

function isLocalRequest(req) {
  const host = req.headers.host || '';
  const hostname = host.split(':')[0];
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getTokenFromRequest(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_token=([^;]+)/);
  return match ? match[1] : null;
}

const routeHandler = new RouteHandler(interfaces);
const sseHandler = new SSEHandler(sseInterfaces);
const dynamicRouter = new DynamicRouter();
const conditionMatcher = new ConditionMatcher();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function handleDynamicSSE(req, res, sseConfig) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });

  const sendEvent = (event) => {
    const eventData = typeof event.data === 'object' ? JSON.stringify(event.data) : event.data;
    let message = '';
    if (event.id) message += `id: ${event.id}\n`;
    if (event.event) message += `event: ${event.event}\n`;
    message += `data: ${eventData}\n\n`;
    res.write(message);
  };

  const streamEvents = async () => {
    if (sseConfig.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, sseConfig.delay));
    }

    let eventIndex = 0;
    const events = sseConfig.events || [];
    const interval = sseConfig.interval || 1000;
    const repeat = sseConfig.repeat || false;

    const sendNextEvent = () => {
      if (res.writableEnded) return;

      if (eventIndex < events.length) {
        sendEvent(events[eventIndex]);
        eventIndex++;
        setTimeout(sendNextEvent, interval);
      } else if (repeat) {
        eventIndex = 0;
        setTimeout(sendNextEvent, interval);
      } else {
        res.end();
      }
    };

    sendNextEvent();
  };

  req.on('close', () => {
    res.end();
  });

  streamEvents();
}

async function handleAdminAPI(req, res, pathname) {
  if (pathname === '/_api/server-info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      local: `http://localhost:${PORT}`,
      network: `http://${localIP}:${PORT}`
    }, null, 2));
    return true;
  }

  if (pathname === '/_api/shutdown' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Server shutting down...' }, null, 2));
    console.log('[Server] Shutdown requested, closing server...');
    setTimeout(() => {
      server.close(() => {
        console.log('[Server] Server closed successfully');
        process.exit(0);
      });
    }, 100);
    return true;
  }

  if (pathname === '/_api/routes' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ routes: dynamicRouter.list() }, null, 2));
    return true;
  }

  if (pathname === '/_api/routes' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.path) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'path is required' }));
      return true;
    }
    const key = dynamicRouter.add(body);
    console.log(`[Dynamic] Added/Updated route: ${key}`);
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, key, route: dynamicRouter.getByKey(key) }, null, 2));
    return true;
  }

  if (pathname === '/_api/routes/export' && req.method === 'GET') {
    const routes = dynamicRouter.list();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="routes.json"'
    });
    res.end(JSON.stringify(routes, null, 2));
    return true;
  }

  if (pathname === '/_api/routes/import' && req.method === 'POST') {
    const body = await parseBody(req);
    
    if (!Array.isArray(body.routes)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'routes must be an array' }));
      return true;
    }

    const result = dynamicRouter.importRoutes(body.routes);
    console.log(`[Dynamic] Imported ${result.imported} routes, ${result.skipped} skipped`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      imported: result.imported,
      skipped: result.skipped,
      total: dynamicRouter.list().length
    }));
    return true;
  }

  if (pathname === '/_api/routes/clear' && req.method === 'POST') {
    dynamicRouter.clear();
    console.log('[Dynamic] Cleared all routes');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return true;
  }

  if (pathname.startsWith('/_api/routes/') && req.method === 'GET') {
    const routeKey = decodeURIComponent(pathname.replace('/_api/routes/', ''));
    const route = dynamicRouter.getByKey(routeKey);
    if (route) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ route }, null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
    return true;
  }

  if (pathname.startsWith('/_api/routes/') && req.method === 'PUT') {
    const routeKey = decodeURIComponent(pathname.replace('/_api/routes/', ''));
    const body = await parseBody(req);
    const updated = dynamicRouter.update(routeKey, body);
    if (updated) {
      console.log(`[Dynamic] Updated route: ${routeKey}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, route: updated }, null, 2));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
    return true;
  }

  if (pathname.startsWith('/_api/routes/') && req.method === 'DELETE') {
    const routePath = decodeURIComponent(pathname.replace('/_api/routes/', ''));
    const deleted = dynamicRouter.remove(routePath);
    if (deleted) {
      console.log(`[Dynamic] Deleted route: ${routePath}`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: deleted }));
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const isLocal = isLocalRequest(req);
  const token = getTokenFromRequest(req);
  const isAuthenticated = isLocal || validateSession(token);

  if (ADMIN_ENABLED && !isAuthenticated) {
    if (pathname === '/_api/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.password === ADMIN_PASSWORD) {
        const newToken = createSession();
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Set-Cookie': `admin_token=${newToken}; Path=/; HttpOnly; Max-Age=86400`
        });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid password' }));
      }
      return;
    }

    if (pathname === '/' || pathname === '/index.html') {
      const lockPagePath = path.join(__dirname, 'public', 'lock.html');
      const lockPage = fs.readFileSync(lockPagePath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(lockPage);
      return;
    }

    if (pathname.startsWith('/_api')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }
  }

  if (pathname === '/' || pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (pathname === '/_health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime()
    }, null, 2));
    return;
  }

  if (pathname === '/_list') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      static: {
        rest: interfaces.map(i => ({ path: i.path, method: i.method, delay: i.delay })),
        sse: sseInterfaces.map(i => ({ path: i.path, delay: i.delay, interval: i.interval, events: i.events.length }))
      },
      dynamic: dynamicRouter.list()
    }, null, 2));
    return;
  }

  const handled = await handleAdminAPI(req, res, pathname);
  if (handled) return;

  const dynamicSSE = dynamicRouter.matchSSE(pathname, req.method);
  if (dynamicSSE) {
    const body = await parseBody(req);
    const matchedResult = conditionMatcher.getMatchedSSEResponse(req, body, dynamicSSE);
    
    const logInfo = matchedResult.matched 
      ? `${req.method} ${pathname} - condition matched, delay: ${matchedResult.delay}ms, interval: ${matchedResult.interval}ms`
      : `${req.method} ${pathname} - delay: ${matchedResult.delay}ms, interval: ${matchedResult.interval}ms`;
    console.log(`[Dynamic SSE] ${logInfo}`);
    
    handleDynamicSSE(req, res, matchedResult);
    return;
  }

  const sseConfig = sseInterfaces.find(item => item.path === pathname);
  if (sseConfig) {
    console.log(`[SSE] ${req.method} ${pathname}`);
    sseHandler.handle(req, res, sseConfig);
    return;
  }

  const matchedInterface = routeHandler.match(req, interfaces);
  if (matchedInterface) {
    console.log(`[REST] ${req.method} ${pathname} - delay: ${matchedInterface.delay}ms`);
    await routeHandler.handle(req, res, matchedInterface);
    return;
  }

  const dynamicRoute = dynamicRouter.match(req);
  if (dynamicRoute && dynamicRoute.type !== 'sse') {
    const body = await parseBody(req);
    const matchedResult = conditionMatcher.getMatchedResponse(req, body, dynamicRoute);
    
    const logInfo = matchedResult.matched 
      ? `${req.method} ${pathname} - condition matched, delay: ${matchedResult.delay}ms`
      : `${req.method} ${pathname} - delay: ${matchedResult.delay}ms`;
    console.log(`[Dynamic REST] ${logInfo}`);
    
    if (matchedResult.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, matchedResult.delay));
    }
    Object.entries(matchedResult.headers || {}).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.writeHead(200);
    const responseBody = typeof matchedResult.response === 'string' 
      ? matchedResult.response 
      : JSON.stringify(matchedResult.response);
    res.end(responseBody);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    code: 404,
    message: 'Not Found',
    hint: 'Visit / to manage routes or /_list to see all endpoints'
  }));
});

function getLocalIP() {
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n Mock Server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIP}:${PORT}`);
  console.log(`\n Admin Panel: http://${localIP}:${PORT}/`);
  console.log(` API List:    http://${localIP}:${PORT}/_list`);
  console.log(` Health Check: http://${localIP}:${PORT}/_health\n`);
  console.log(' Static REST endpoints:');
  interfaces.forEach(i => {
    console.log(`   ${i.method.padEnd(6)} ${i.path} (delay: ${i.delay}ms)`);
  });
  console.log('\n Static SSE endpoints:');
  sseInterfaces.forEach(i => {
    console.log(`   GET    ${i.path} (delay: ${i.delay}ms, interval: ${i.interval}ms)`);
  });
  console.log('');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
