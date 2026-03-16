const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'routes.json');

class DynamicRouter {
  constructor() {
    this.routes = new Map();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const routes = JSON.parse(data);
        routes.forEach(route => {
          const isSSE = route.type === 'sse';
          const method = route.method || 'GET';
          const key = isSSE ? `SSE:${method}:${route.path}` : `${method}:${route.path}`;
          this.routes.set(key, route);
        });
        console.log(`[Dynamic] Loaded ${this.routes.size} routes from storage`);
      }
    } catch (e) {
      console.error('[Dynamic] Failed to load routes:', e.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const routes = Array.from(this.routes.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify(routes, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Dynamic] Failed to save routes:', e.message);
    }
  }

  add(config) {
    const isSSE = config.type === 'sse';
    const method = config.method || 'GET';
    const key = isSSE ? `SSE:${method}:${config.path}` : `${method}:${config.path}`;
    
    const existing = this.routes.get(key);
    
    const route = {
      path: config.path,
      method: method,
      type: config.type || 'rest',
      delay: config.delay || 0,
      headers: config.headers || {},
      response: config.response || {},
      conditions: config.conditions || [],
      defaultResponse: config.defaultResponse,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    if (isSSE) {
      route.interval = config.interval || 1000;
      route.repeat = config.repeat || false;
      route.events = config.events || [];
    }

    this.routes.set(key, route);
    this.save();
    return key;
  }

  update(routeKey, config) {
    const existing = this.routes.get(routeKey);
    if (!existing) return null;

    const isSSE = existing.type === 'sse';
    
    const updated = {
      ...existing,
      delay: config.delay !== undefined ? config.delay : existing.delay,
      headers: config.headers !== undefined ? config.headers : existing.headers,
      response: config.response !== undefined ? config.response : existing.response,
      conditions: config.conditions !== undefined ? config.conditions : existing.conditions,
      defaultResponse: config.defaultResponse !== undefined ? config.defaultResponse : existing.defaultResponse,
      updatedAt: Date.now()
    };

    if (isSSE) {
      updated.interval = config.interval !== undefined ? config.interval : existing.interval;
      updated.repeat = config.repeat !== undefined ? config.repeat : existing.repeat;
      updated.events = config.events !== undefined ? config.events : existing.events;
    }

    this.routes.set(routeKey, updated);
    this.save();
    return updated;
  }

  remove(path, method = 'GET') {
    const key = path.includes(':') ? path : `${method}:${path}`;
    const deleted = this.routes.delete(key);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  get(path, method = 'GET') {
    const sseKey = `SSE:${method}:${path}`;
    const restKey = `${method}:${path}`;
    return this.routes.get(sseKey) || this.routes.get(restKey);
  }

  getByKey(key) {
    return this.routes.get(key);
  }

  list() {
    return Array.from(this.routes.values());
  }

  listSSE() {
    return Array.from(this.routes.values()).filter(r => r.type === 'sse');
  }

  listREST() {
    return Array.from(this.routes.values()).filter(r => r.type !== 'sse');
  }

  clear() {
    this.routes.clear();
    this.save();
  }

  match(req) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    
    const sseRoute = this.routes.get(`SSE:${method}:${pathname}`);
    if (sseRoute) return sseRoute;
    
    return this.routes.get(`${method}:${pathname}`);
  }

  matchSSE(pathname, method = 'GET') {
    return this.routes.get(`SSE:${method}:${pathname}`);
  }

  importRoutes(routes) {
    let imported = 0;
    let skipped = 0;

    routes.forEach(route => {
      if (!route.path) {
        skipped++;
        return;
      }

      const isSSE = route.type === 'sse';
      const method = route.method || 'GET';
      const key = isSSE ? `SSE:${method}:${route.path}` : `${method}:${route.path}`;
      
      const existing = this.routes.get(key);
      
      const newRoute = {
        path: route.path,
        method: method,
        type: route.type || 'rest',
        delay: route.delay || 0,
        headers: route.headers || {},
        response: route.response || {},
        conditions: route.conditions || [],
        defaultResponse: route.defaultResponse,
        createdAt: existing ? existing.createdAt : Date.now(),
        updatedAt: Date.now()
      };

      if (isSSE) {
        newRoute.interval = route.interval || 1000;
        newRoute.repeat = route.repeat || false;
        newRoute.events = route.events || [];
      }

      this.routes.set(key, newRoute);
      imported++;
    });

    if (imported > 0) {
      this.save();
    }

    return { imported, skipped };
  }
}

module.exports = DynamicRouter;
