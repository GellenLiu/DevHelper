/**
 * content-script.js - 内容脚本，运行在页面和插件之间的桥梁
 * 负责注入脚本、转发消息、处理请求转发
 */

// 记录当前活跃的规则
let activeRules = [];
let handshakeReceived = false;

// 检查域名是否在允许列表中
function isDomainAllowed(domain, allowedDomains) {
  // 当 allowedDomains 为 undefined 或 null 时，使用默认值 '*'
  // 当 allowedDomains 为空字符串或只包含空白字符时，返回 false
  if (allowedDomains === undefined || allowedDomains === null) {
    allowedDomains = '*';
  }
  
  if (allowedDomains.trim() === '') {
    return false; // 空列表表示所有页面都不启用
  }

  const domains = allowedDomains.split('\n').map(d => d.trim()).filter(d => d !== '');
  
  // 转换为小写进行比较
  const lowerDomain = domain.toLowerCase();
  
  for (const allowedDomain of domains) {
    const lowerAllowed = allowedDomain.toLowerCase();
    
    // 完全匹配
    if (lowerDomain === lowerAllowed) {
      return true;
    }
    
    // 子域名匹配，如 *.example.com
    if (lowerAllowed.startsWith('*.')) {
      const baseDomain = lowerAllowed.slice(2);
      if (lowerDomain === baseDomain || lowerDomain.endsWith('.' + baseDomain)) {
        return true;
      }
    }
    
    // 通配符匹配，如 *
    if (lowerAllowed === '*') {
      return true;
    }
  }
  
  return false;
}

// 注入 injected.js 脚本到页面
function injectScript() {
  // 获取设置
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    // 检查全局开关
    if (settings.globalEnable === false) {
      return;
    }
    
    // 检查域名是否在允许列表中
    const currentDomain = window.location.hostname;
    if (!isDomainAllowed(currentDomain, settings.allowedDomains)) {
      return;
    }
    
    // 注入脚本
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = function() { this.remove(); };
      script.onerror = function() { console.error('Failed to load injected script'); this.remove(); };
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
    }
  });
}

// 初始化时获取规则
chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
  if (response && response.rules) activeRules = response.rules;
});

// 监听规则更新
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_RULES') {
    activeRules = request.rules || [];
  }
});

// 先注册消息监听器，再注入脚本，避免注入脚本发送消息时 listener 尚未注册导致丢失
// 监听来自注入脚本的消息
window.addEventListener('message', async (event) => {
    // 只接收来自同一窗口的消息
    if (event.source !== window) return;

    const { type, data } = event.data;

    // 如果注入脚本通知已加载，回个 ack
    if (type === 'INJECTED_LOADED') {
      window.postMessage({ type: 'INJECTED_ACK', from: 'content-script' }, '*');
      handshakeReceived = true;
      return;
    }

    try {
      // 处理请求拦截
      if (type === 'INTERCEPT_REQUEST') {
        // 发送请求信息到 background script
        chrome.runtime.sendMessage({ type: 'INTERCEPT_REQUEST', data: data, tabUrl: window.location.href }, (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, error: 'BACKGROUND_ERROR: ' + chrome.runtime.lastError.message, from: 'content-script' } }, '*');
            return;
          }

          if (!response) {
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, error: 'EMPTY_RESPONSE', from: 'content-script' } }, '*');
            return;
          }

          if (response && response.matched && response.response) {
            // 如果请求被转发，将代理响应发送回 injected script
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, status: response.response.status, statusText: response.response.statusText, headers: response.response.headers || {}, body: response.response.body, error: null, fallbackToOrigin: response.fallbackToOrigin !== false, from: 'content-script' } }, '*');
          } else {
            // 没有匹配的规则或其他错误，让原始请求继续
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, error: 'NO_RULE_MATCHED', matched: false, fallbackToOrigin: response?.fallbackToOrigin !== false, from: 'content-script' } }, '*');
          }
        });
      }

      // 处理响应记录
      if (type === 'INTERCEPT_RESPONSE') {
        chrome.runtime.sendMessage({ type: 'INTERCEPT_RESPONSE', data: data, tabUrl: window.location.href });
      }

      // 处理错误记录
      if (type === 'INTERCEPT_ERROR') {
        chrome.runtime.sendMessage({ type: 'INTERCEPT_ERROR', data: data, tabUrl: window.location.href });
      }
    } catch (error) {
      console.error('[Content Script] Error in message handler:', error);
    }
  });

// 在文档开始时注入脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}
