/**
 * background.js - Service Worker 后台脚本
 * 管理规则、拦截请求、处理转发、管理日志
 */

// ============ RuleManager 类 ============
class RuleManager {
  constructor() {
    this.rules = [];
    this.storageKey = 'forwardingRules';
  }

  async initialize() {
    const rules = await chrome.storage.local.get(this.storageKey);
    this.rules = rules[this.storageKey] || [];
    return this.rules;
  }

  async getRules() {
    const rules = await chrome.storage.local.get(this.storageKey);
    this.rules = rules[this.storageKey] || [];
    return this.rules;
  }

  async getEnabledRules() {
    const rules = await this.getRules();
    return rules.filter(rule => rule.enabled);
  }

  async getRule(id) {
    const rules = await this.getRules();
    return rules.find(rule => rule.id === id);
  }

  async createRule(ruleData) {
    const rule = {
      id: Date.now(),
      name: ruleData.name || '新规则',
      sourcePattern: ruleData.sourcePattern || '',
      targetUrl: ruleData.targetUrl || '',
      enabled: true,
      method: ruleData.method || 'ALL',
      description: ruleData.description || '',
      cookies: {
        enabled: ruleData.cookies?.enabled !== false,
        auto: ruleData.cookies?.auto !== false,
        manual: ruleData.cookies?.manual || []
      },
      headers: ruleData.headers || {},
      responseModify: {
        enabled: false,
        rules: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.push(rule);
    await this._save();
    return rule;
  }

  async updateRule(id, updates) {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) {
      throw new Error(`Rule with id ${id} not found`);
    }

    Object.assign(rule, updates, {
      updatedAt: new Date().toISOString()
    });

    await this._save();
    return rule;
  }

  async deleteRule(id) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Rule with id ${id} not found`);
    }

    this.rules.splice(index, 1);
    await this._save();
  }

  async enableRule(id) {
    return this.updateRule(id, { enabled: true });
  }

  async disableRule(id) {
    return this.updateRule(id, { enabled: false });
  }

  matchRule(url, method = 'GET') {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (rule.method !== 'ALL' && rule.method !== method.toUpperCase()) {
        continue;
      }

      try {
        const urlPattern = new RegExp(rule.sourcePattern, 'i');
        if (urlPattern.test(url)) {
          return rule;
        }
      } catch (error) {
        console.error('Invalid regex pattern:', rule.sourcePattern, error);
      }
    }
    return null;
  }

  calculateTargetUrl(sourceUrl, rule) {
    try {
      const urlPattern = new RegExp(rule.sourcePattern, 'i');
      let targetUrl = sourceUrl.replace(urlPattern, rule.targetUrl);
      return targetUrl;
    } catch (error) {
      console.error('Error calculating target URL:', error);
      return sourceUrl;
    }
  }

  async _save() {
    await chrome.storage.local.set({ [this.storageKey]: this.rules });
  }

  getStats() {
    return {
      total: this.rules.length,
      enabled: this.rules.filter(r => r.enabled).length,
      disabled: this.rules.filter(r => !r.enabled).length
    };
  }
}

// ============ CookieManager 类 ============
class CookieManager {
  constructor() {
    this.manualCookiesKey = 'manualCookies';
    this.autoCookiesKey = 'autoCookies';
  }

  async getUrlCookies(url) {
    try {
      const cookies = await chrome.cookies.getAll({ url: url });
      const result = {};
      cookies.forEach(cookie => {
        result[cookie.name] = cookie.value;
      });
      return result;
    } catch (error) {
      console.error('Failed to get cookies for URL:', url, error);
      return {};
    }
  }

  async getCookiesForRule(ruleId, targetUrl) {
    const manualCookies = await this._getManualCookies(ruleId);

    let autoCookies = {};
    try {
      autoCookies = await this.getUrlCookies(targetUrl);
      await this._saveAutoCookies(ruleId, autoCookies);
    } catch (error) {
      console.error('Failed to get auto cookies:', error);
      autoCookies = await this._getAutoCookies(ruleId);
    }

    const merged = { ...autoCookies, ...manualCookies };
    return merged;
  }

  async addManualCookie(ruleId, name, value, options = {}) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const cookies = manualCookies[this.manualCookiesKey] || {};

    if (!cookies[ruleId]) {
      cookies[ruleId] = {};
    }

    cookies[ruleId][name] = {
      value: value,
      domain: options.domain || '',
      path: options.path || '/',
      secure: options.secure || false,
      httpOnly: options.httpOnly || false,
      sameSite: options.sameSite || 'Lax'
    };

    await chrome.storage.local.set({ [this.manualCookiesKey]: cookies });
  }

  async deleteManualCookie(ruleId, name) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const cookies = manualCookies[this.manualCookiesKey] || {};

    if (cookies[ruleId]) {
      delete cookies[ruleId][name];
    }

    await chrome.storage.local.set({ [this.manualCookiesKey]: cookies });
  }

  async _getManualCookies(ruleId) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const cookies = manualCookies[this.manualCookiesKey] || {};
    const ruleCookies = cookies[ruleId] || {};

    const result = {};
    Object.entries(ruleCookies).forEach(([name, cookie]) => {
      result[name] = cookie.value;
    });

    return result;
  }

  async _getAutoCookies(ruleId) {
    const autoCookies = await chrome.storage.local.get(this.autoCookiesKey);
    const cookies = autoCookies[this.autoCookiesKey] || {};
    return cookies[ruleId] || {};
  }

  async _saveAutoCookies(ruleId, cookies) {
    const autoCookies = await chrome.storage.local.get(this.autoCookiesKey);
    const all = autoCookies[this.autoCookiesKey] || {};
    all[ruleId] = cookies;
    await chrome.storage.local.set({ [this.autoCookiesKey]: all });
  }

  buildCookieHeader(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  async refreshAutoCookies(ruleId, targetUrl) {
    try {
      const cookies = await this.getUrlCookies(targetUrl);
      await this._saveAutoCookies(ruleId, cookies);
      return cookies;
    } catch (error) {
      console.error('Failed to refresh cookies:', error);
      throw error;
    }
  }
}

// ============ Logger 类 ============
class Logger {
  constructor(maxLogs = 2000) {
    this.maxLogs = maxLogs;
    this.requestLogsKey = 'requestLogs';
    this.responseLogsKey = 'responseLogs';
  }

  async initialize() {
    const logs = await chrome.storage.local.get([this.requestLogsKey, this.responseLogsKey]);
    this.logs = {
      requests: logs[this.requestLogsKey] || [],
      responses: logs[this.responseLogsKey] || []
    };
  }

  async addRequestLog(logData) {
    const log = {
      id: Date.now() + Math.random(),
      type: 'request',
      timestamp: logData.timestamp || new Date().toISOString(),
      sourceUrl: logData.url,  // 原始请求 URL
      targetUrl: logData.targetUrl,  // 转发目标 URL
      method: logData.method || 'GET',
      headers: logData.headers || {},
      body: logData.body,  // 请求参数/请求体
      ruleId: logData.ruleId,
      ruleName: logData.ruleName,
      tabUrl: logData.tabUrl,
      matched: logData.matched !== false  // 是否匹配规则
    };

    const logs = await chrome.storage.local.get(this.requestLogsKey);
    const requests = logs[this.requestLogsKey] || [];
    requests.unshift(log);

    if (requests.length > this.maxLogs) {
      requests.splice(this.maxLogs);
    }

    await chrome.storage.local.set({ [this.requestLogsKey]: requests });
    return log;
  }

  async addResponseLog(logData) {
    const log = {
      id: Date.now() + Math.random(),
      type: 'response',
      timestamp: logData.timestamp || new Date().toISOString(),
      sourceUrl: logData.sourceUrl,  // 原始请求 URL
      targetUrl: logData.targetUrl,  // 实际请求的 URL
      status: logData.status,
      statusText: logData.statusText,
      body: logData.body,  // 响应体
      headers: logData.headers || {},
      ruleId: logData.ruleId,
      ruleName: logData.ruleName,
      size: this._getSize(logData.body),
      duration: logData.duration  // 请求耗时（毫秒）
    };

    const logs = await chrome.storage.local.get(this.responseLogsKey);
    const responses = logs[this.responseLogsKey] || [];
    responses.unshift(log);

    if (responses.length > this.maxLogs) {
      responses.splice(this.maxLogs);
    }

    await chrome.storage.local.set({ [this.responseLogsKey]: responses });
    return log;
  }

  async addErrorLog(logData) {
    const log = {
      id: Date.now() + Math.random(),
      type: 'error',
      timestamp: logData.timestamp || new Date().toISOString(),
      sourceUrl: logData.url,
      targetUrl: logData.targetUrl,
      error: logData.error,
      ruleId: logData.ruleId,
      ruleName: logData.ruleName
    };

    const logs = await chrome.storage.local.get(this.requestLogsKey);
    const requests = logs[this.requestLogsKey] || [];
    requests.unshift(log);

    if (requests.length > this.maxLogs) {
      requests.splice(this.maxLogs);
    }

    await chrome.storage.local.set({ [this.requestLogsKey]: requests });
    return log;
  }

  async getAllLogs() {
    const logs = await chrome.storage.local.get([this.requestLogsKey, this.responseLogsKey]);
    const requests = logs[this.requestLogsKey] || [];
    const responses = logs[this.responseLogsKey] || [];

    const all = [...requests, ...responses].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return all;
  }

  async clearAllLogs() {
    await chrome.storage.local.remove(this.requestLogsKey);
    await chrome.storage.local.remove(this.responseLogsKey);
  }

  _getSize(data) {
    if (!data) return 0;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return (new Blob([str]).size / 1024).toFixed(2) + ' KB';
  }

  async getStats() {
    const allLogs = await this.getAllLogs();
    const requests = allLogs.filter(log => log.type === 'request');
    const responses = allLogs.filter(log => log.type === 'response');
    const errors = allLogs.filter(log => log.type === 'error');

    return {
      total: allLogs.length,
      requests: requests.length,
      responses: responses.length,
      errors: errors.length
    };
  }
}

// ============ 初始化 ============
let ruleManager;
let cookieManager;
let logger;

// 初始化
(async () => {
  try {
    ruleManager = new RuleManager();
    await ruleManager.initialize();

    cookieManager = new CookieManager();

    logger = new Logger();
    await logger.initialize();

    console.log('API Proxy Service Worker initialized successfully');
  } catch (error) {
    console.error('Failed to initialize API Proxy Service Worker:', error);
  }
})();

/**
 * 监听来自 content script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 使用异步处理
  handleMessage(request, sender, sendResponse);
  return true; // 保持通道开放以支持异步响应
});

/**
 * 处理来自 content script 的消息
 */
async function handleMessage(request, sender, sendResponse) {
  try {
    const { type, data, tabUrl } = request;

    if (type === 'INTERCEPT_REQUEST') {
      await handleInterceptRequest(data, tabUrl, sendResponse);
    } else if (type === 'INTERCEPT_RESPONSE') {
      await handleInterceptResponse(data, sendResponse);
    } else if (type === 'INTERCEPT_ERROR') {
      await handleInterceptError(data, sendResponse);
    } else if (type === 'GET_RULES') {
      const rules = await ruleManager.getRules();
      sendResponse({ success: true, rules });
    } else if (type === 'ADD_RULE') {
      const rule = await ruleManager.createRule(data);
      sendResponse({ success: true, rule });
    } else if (type === 'UPDATE_RULE') {
      const rule = await ruleManager.updateRule(data.id, data.updates);
      sendResponse({ success: true, rule });
    } else if (type === 'DELETE_RULE') {
      await ruleManager.deleteRule(data);
      sendResponse({ success: true });
    } else if (type === 'GET_LOGS') {
      const logs = await logger.getAllLogs();
      sendResponse({ success: true, logs });
    } else if (type === 'CLEAR_LOGS') {
      await logger.clearAllLogs();
      sendResponse({ success: true });
    } else if (type === 'SEARCH_LOGS') {
      const logs = await logger.searchLogs(data.keyword, data.options);
      sendResponse({ success: true, logs });
    } else if (type === 'GET_COOKIES_FOR_RULE') {
      const cookies = await cookieManager.getCookiesForRule(data.ruleId, data.targetUrl);
      sendResponse({ success: true, cookies });
    } else if (type === 'ADD_MANUAL_COOKIE') {
      await cookieManager.addManualCookie(data.ruleId, data.name, data.value, data.options);
      sendResponse({ success: true });
    } else if (type === 'DELETE_MANUAL_COOKIE') {
      await cookieManager.deleteManualCookie(data.ruleId, data.name);
      sendResponse({ success: true });
    } else if (type === 'REFRESH_COOKIES') {
      const cookies = await cookieManager.refreshAutoCookies(data.ruleId, data.targetUrl);
      sendResponse({ success: true, cookies });
    } else if (type === 'GET_STATS') {
      const stats = await logger.getStats();
      const ruleStats = ruleManager.getStats();
      sendResponse({ success: true, stats, ruleStats });
    } else {
      sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 处理拦截到的请求
 */
async function handleInterceptRequest(data, tabUrl, sendResponse) {
  try {
    console.log('[Background] INTERCEPT_REQUEST received, ID:', data.id, 'URL:', data.url);
    const startTime = Date.now();  // 记录开始时间
    
    const rule = ruleManager.matchRule(data.url, data.method);

    if (!rule) {
      // 没有匹配的规则，记录日志但不转发
      console.log('[Background] No rule matched for:', data.url);
      await logger.addRequestLog({
        url: data.url,
        method: data.method,
        headers: data.headers,
        body: data.body,
        timestamp: data.timestamp,
        tabUrl: tabUrl,
        matched: false
      });

      sendResponse({ success: false, matched: false });
      return;
    }

    console.log('[Background] Rule matched:', rule.name, 'for URL:', data.url);

    // 计算目标 URL
    const targetUrl = ruleManager.calculateTargetUrl(data.url, rule);
    console.log('[Background] Target URL:', targetUrl);

    // 记录原始请求
    await logger.addRequestLog({
      url: data.url,
      method: data.method,
      headers: data.headers,
      body: data.body,
      ruleId: rule.id,
      ruleName: rule.name,
      targetUrl: targetUrl,
      timestamp: data.timestamp,
      tabUrl: tabUrl,
      matched: true
    });

    // 获取 Cookies
    let cookies = {};
    if (rule.cookies && rule.cookies.enabled) {
      try {
        cookies = await cookieManager.getCookiesForRule(rule.id, targetUrl);
      } catch (error) {
        console.error('[Background] Failed to get cookies:', error);
      }
    }

    // 构建转发请求
    const forwardOptions = {
      method: data.method || 'GET',
      headers: {
        ...data.headers
      },
      credentials: 'include'
    };

    // 添加自定义 Headers
    if (rule.headers) {
      Object.assign(forwardOptions.headers, rule.headers);
    }

    // 添加 Cookie 头
    if (Object.keys(cookies).length > 0) {
      forwardOptions.headers['Cookie'] = cookieManager.buildCookieHeader(cookies);
    }

    // 添加请求体
    if (data.body) {
      forwardOptions.body = data.body;
    }

    console.log('[Background] Forwarding request to:', targetUrl, 'method:', data.method);
    console.log('[Background] Forward options:', JSON.stringify({
      method: forwardOptions.method,
      headers: forwardOptions.headers,
      hasBody: !!forwardOptions.body
    }, null, 2));

    // 执行转发请求
    let response;
    try {
      response = await fetch(targetUrl, forwardOptions);
    } catch (fetchError) {
      console.error('[Background] Fetch failed:', fetchError);
      throw fetchError;
    }
    
    const duration = Date.now() - startTime;  // 计算耗时
    console.log('[Background] Got response status:', response.status, 'statusText:', response.statusText, 'duration:', duration, 'ms');

    // 获取响应数据
    const contentType = response.headers.get('content-type');
    console.log('[Background] Response content-type:', contentType);
    let responseBody;

    if (contentType && contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
        console.log('[Background] Parsed JSON response, type:', typeof responseBody);
      } catch (parseError) {
        console.warn('[Background] Failed to parse JSON, falling back to text:', parseError);
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
      console.log('[Background] Got text response, length:', responseBody.length);
    }

    console.log('[Background] Response body type:', typeof responseBody, 'length:', responseBody?.length || responseBody?.toString?.length);

    // 记录响应
    await logger.addResponseLog({
      sourceUrl: data.url,
      targetUrl: targetUrl,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries()),
      ruleId: rule.id,
      ruleName: rule.name,
      duration: duration,
      timestamp: new Date().toISOString()
    });

    // 构建响应对象
    const responseObj = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      ok: response.ok
    };

    console.log('[Background] Sending back response for ID:', data.id, 'status:', responseObj.status);
    sendResponse({ success: true, matched: true, response: responseObj });
  } catch (error) {
    console.error('[Background] Error forwarding request:', error);

    // 计算目标 URL 以便记录
    let targetUrl = data.url;
    const rule = ruleManager.matchRule(data.url, data.method);
    if (rule) {
      targetUrl = ruleManager.calculateTargetUrl(data.url, rule);
    }

    // 记录错误
    await logger.addErrorLog({
      url: data.url,
      targetUrl: targetUrl,
      error: error.message,
      ruleId: rule?.id,
      ruleName: rule?.name,
      timestamp: new Date().toISOString()
    });

    sendResponse({
      success: false,
      error: error.message,
      matched: false
    });
  }
}

/**
 * 处理拦截到的响应
 */
async function handleInterceptResponse(data, sendResponse) {
  try {
    // 响应已经在 handleInterceptRequest 中处理过了
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling response:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 处理请求错误
 */
async function handleInterceptError(data, sendResponse) {
  try {
    await logger.addErrorLog({
      url: data.url,
      error: data.error,
      timestamp: data.timestamp
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling error log:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 监听扩展安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('API Proxy extension installed');
    // 打开欢迎页面（可选）
    // chrome.tabs.create({ url: 'popup/popup.html' });
  } else if (details.reason === 'update') {
    console.log('API Proxy extension updated');
  }
});

// 监听扩展图标点击事件，打开选项页面（新窗口）
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

console.log('Background service worker loaded');
