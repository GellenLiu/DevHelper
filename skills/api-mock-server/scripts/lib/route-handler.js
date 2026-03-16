class RouteHandler {
  constructor(config) {
    this.config = config;
  }

  match(req, interfaces) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    return interfaces.find(item => {
      return item.path === pathname && item.method === method;
    });
  }

  async handle(req, res, interfaceConfig) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (interfaceConfig.delay > 0) {
      await this.sleep(interfaceConfig.delay);
    }

    let responseBody = interfaceConfig.response;

    if (typeof interfaceConfig.responseHandler === 'function') {
      try {
        const body = await this.parseBody(req);
        responseBody = interfaceConfig.responseHandler(req, body);
      } catch (e) {
        responseBody = { code: 500, message: 'Response handler error', error: e.message };
      }
    }

    res.writeHead(200);
    res.end(JSON.stringify(responseBody));
  }

  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          resolve(body);
        }
      });
      req.on('error', reject);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RouteHandler;
