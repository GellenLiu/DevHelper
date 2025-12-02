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
    // 先从存储中加载最新的规则
    await this.getRules();
    
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

  matchRule(url, method = 'GET', tabUrl = '') {
    let fullUrl = url;
    // 处理相对路径
    if (url && !url.startsWith('http')) {
      try {
        // 如果提供了tabUrl，使用它来构建完整URL
        if (tabUrl && tabUrl.startsWith('http')) {
          const baseUrl = new URL(tabUrl);
          fullUrl = new URL(url, baseUrl.origin).href;
        }
      } catch (error) {
        console.error('Error constructing full URL:', error);
      }
    }
    
    const urlLower = (fullUrl || '').toString().toLowerCase();
    for (const rule of this.rules) {
      if (!rule.enabled) {
        continue;
      }

      if (rule.method !== 'ALL' && rule.method !== method.toUpperCase()) {
        continue;
      }

      const patternRaw = (rule.sourcePattern || '').toString().trim();
      if (!patternRaw) {
        continue;
      }
      
      // 方法1：精确匹配 - 检查请求URL是否以源模式开头
      const prefix = patternRaw.toLowerCase();
      if (urlLower.startsWith(prefix)) {
        return rule;
      }
      
      // 方法2：URL对象匹配 - 检查域名是否匹配
      try {
        const sourceUrl = new URL(patternRaw);
        const requestUrl = new URL(fullUrl);
        // 如果源和目标的协议、域名都匹配，直接返回规则
        if (sourceUrl.protocol === requestUrl.protocol && sourceUrl.hostname === requestUrl.hostname) {
          return rule;
        }
      } catch (error) {
      }
      
      // 方法3：正则表达式匹配
      if (patternRaw.startsWith('/') && patternRaw.endsWith('/')) {
        // 正则表达式匹配
        const inner = patternRaw.slice(1, -1);
        const urlPattern = new RegExp(inner, 'i');
        if (urlPattern.test(fullUrl)) {
          return rule;
        }
      }
      
    }
    return null;
  }

  calculateTargetUrl(sourceUrl, rule) {
    try {
      let targetUrl;
      const pattern = rule.sourcePattern;
      
      // 检查是否为正则表达式格式（以/开头和结尾）
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        // 正则表达式替换
        const regex = new RegExp(pattern.slice(1, -1), 'i');
        targetUrl = sourceUrl.replace(regex, rule.targetUrl);
      } else {
        // 处理完整域名替换
        try {
          // 解析目标URL，确保它是完整的
          const targetUrlObj = new URL(rule.targetUrl);
          
          // 检查sourceUrl是否为完整URL
          try {
            const sourceUrlObj = new URL(sourceUrl);
            const patternUrlObj = new URL(pattern);
            
            // 替换域名，保留路径和查询参数
            targetUrl = sourceUrl.replace(patternUrlObj.origin, targetUrlObj.origin);
          } catch (sourceUrlError) {
            // sourceUrl是相对路径，直接使用目标URL的origin加上相对路径
            targetUrl = new URL(sourceUrl, targetUrlObj.origin).href;
          }
        } catch (urlError) {
          // 简单字符串替换（前缀匹配）
          if (sourceUrl.startsWith(pattern)) {
            targetUrl = rule.targetUrl + sourceUrl.slice(pattern.length);
          } else {
            targetUrl = sourceUrl;
          }
        }
      }
      
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
      return {};
    }
  }

  async getCookiesForRule(ruleId, targetUrl, rule) {
    const manualCookies = await this._getManualCookies(ruleId);
    
    // 判断是否启用自动收集cookie
    const isAutoEnabled = rule?.cookies?.auto !== false;

    let autoCookies = {};
    if (isAutoEnabled) {
      try {
        autoCookies = await this.getUrlCookies(targetUrl);
        await this._saveAutoCookies(ruleId, autoCookies);
      } catch (error) {
        autoCookies = await this._getAutoCookies(ruleId);
      }
    }

    // 如果启用自动收集，则融合自动和手动cookie，手动cookie优先级更高
    // 如果禁用自动收集，则只使用手动cookie
    const merged = isAutoEnabled ? { ...autoCookies, ...manualCookies } : manualCookies;
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

  async setManualCookies(ruleId, cookies) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const allManualCookies = manualCookies[this.manualCookiesKey] || {};

    // 清空该规则下的所有手动 cookie
    allManualCookies[ruleId] = {};

    // 添加新的 cookie
    for (const [name, value] of Object.entries(cookies)) {
      allManualCookies[ruleId][name] = {
        value: value,
        domain: '',
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax'
      };
    }

    await chrome.storage.local.set({ [this.manualCookiesKey]: allManualCookies });
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

  async searchLogs(keyword, options = {}) {
    const allLogs = await this.getAllLogs();
    
    return allLogs.filter(log => {
      // 过滤类型
      if (options.type && log.type !== options.type) {
        return false;
      }
      
      // 搜索关键字
      if (keyword) {
        const searchStr = keyword.toLowerCase();
        const logStr = JSON.stringify(log).toLowerCase();
        return logStr.includes(searchStr);
      }
      
      return true;
    });
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

  } catch (error) {
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
      // 获取规则信息
      const rule = await ruleManager.getRule(data.ruleId);
      const cookies = await cookieManager.getCookiesForRule(data.ruleId, data.targetUrl, rule);
      sendResponse({ success: true, cookies });
    } else if (type === 'ADD_MANUAL_COOKIE') {
      await cookieManager.addManualCookie(data.ruleId, data.name, data.value, data.options);
      sendResponse({ success: true });
    } else if (type === 'SET_MANUAL_COOKIES') {
      await cookieManager.setManualCookies(data.ruleId, data.cookies);
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
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 处理拦截到的请求
 */
async function handleInterceptRequest(data, tabUrl, sendResponse) {
  try {

    const startTime = Date.now();  // 记录开始时间
    // 获取 fallback 设置（默认 true）并随响应回传给 content-script
    const storageRes = await chrome.storage.local.get(['settings']);
    const fallbackToOrigin = storageRes.settings?.fallbackToOrigin !== false;
    
    // 获取所有规则，用于调试
    const allRules = await ruleManager.getRules();
    
    // 尝试匹配规则，传递tabUrl以处理相对路径
    const rule = ruleManager.matchRule(data.url, data.method, tabUrl);
    
    if (!rule) {
      // 没有匹配的规则，直接返回，不记录日志
      sendResponse({ success: false, matched: false, fallbackToOrigin });
      return;
    }

    // 计算目标 URL
    const targetUrl = ruleManager.calculateTargetUrl(data.url, rule);
    console.log('[Background] Rule matched:', rule.name, 'for URL:', data.url, '->', targetUrl);

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
        cookies = await cookieManager.getCookiesForRule(rule.id, targetUrl, rule);
      } catch (error) {
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

    // 执行转发请求
    let response;
    try {
      response = await fetch(targetUrl, forwardOptions);
    } catch (fetchError) {
      // 记录错误日志并直接返回给 content-script，避免抛出异常中断流程
      await logger.addErrorLog({
        url: data.url,
        targetUrl: targetUrl,
        error: fetchError.message || String(fetchError),
        ruleId: rule?.id,
        ruleName: rule?.name,
        timestamp: new Date().toISOString()
      });

      sendResponse({
        success: false,
        error: fetchError.message || String(fetchError),
        matched: true, // 仍然标记为匹配，因为规则匹配成功，只是请求失败
        fallbackToOrigin
      });
      return;
    }
    
    const duration = Date.now() - startTime;  // 计算耗时

    // 获取响应数据
    const contentType = response.headers.get('content-type');
    let responseBody;

    if (contentType && contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch (parseError) {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
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

    sendResponse({ success: true, matched: true, response: responseObj, fallbackToOrigin });
  } catch (error) {

    // 计算目标 URL 以便记录
    let targetUrl = data.url;
    const rule = ruleManager.matchRule(data.url, data.method, tabUrl);
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
      matched: false,
      fallbackToOrigin: typeof fallbackToOrigin !== 'undefined' ? fallbackToOrigin : true
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
    sendResponse({ success: false, error: error.message });
  }
}

// 监听扩展图标点击事件，打开选项页面（新窗口）
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});