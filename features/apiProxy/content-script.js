/**
 * content-script.js - 内容脚本，运行在页面和插件之间的桥梁
 * 负责注入脚本、转发消息、处理请求转发
 */

// 注入 injected.js 脚本到页面
function injectScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      this.remove();
    };
    script.onerror = function() {
      console.error('Failed to load injected script');
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('Error injecting script:', error);
  }
}

// 在文档开始时注入脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}

// 记录当前活跃的规则
let activeRules = [];

// 初始化时获取规则
chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
  if (response && response.rules) {
    activeRules = response.rules;
  }
});

// 监听规则更新
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_RULES') {
    activeRules = request.rules || [];
  }
});

// 监听来自注入脚本的消息
window.addEventListener('message', async (event) => {
  // 只接收来自同一窗口的消息
  if (event.source !== window) return;

  const { type, data } = event.data;

  try {
    // 处理请求拦截
    if (type === 'INTERCEPT_REQUEST') {
      console.log('[Content Script] INTERCEPT_REQUEST received, ID:', data.id, 'URL:', data.url);
      
      // 发送请求信息到 background script
      chrome.runtime.sendMessage({
        type: 'INTERCEPT_REQUEST',
        data: data,
        tabUrl: window.location.href
      }, (response) => {
        console.log('[Content Script] Got response from background for ID:', data.id, 'response:', response);
        
        if (chrome.runtime.lastError) {
          console.error('[Content Script] chrome.runtime.lastError:', chrome.runtime.lastError);
          window.postMessage({
            type: 'FORWARD_RESPONSE',
            data: {
              id: data.id,
              error: 'BACKGROUND_ERROR: ' + chrome.runtime.lastError.message,
              from: 'content-script'
            }
          }, '*');
          return;
        }
        
        if (!response) {
          console.warn('[Content Script] Empty response from background for ID:', data.id);
          window.postMessage({
            type: 'FORWARD_RESPONSE',
            data: {
              id: data.id,
              error: 'EMPTY_RESPONSE',
              from: 'content-script'
            }
          }, '*');
          return;
        }
        
        if (response && response.matched && response.response) {
          // 如果请求被转发，将代理响应发送回 injected script
          console.log('[Content Script] Sending FORWARD_RESPONSE for ID:', data.id, 'status:', response.response.status);
          window.postMessage({
            type: 'FORWARD_RESPONSE',
            data: {
              id: data.id,
              status: response.response.status,
              statusText: response.response.statusText,
              headers: response.response.headers || {},
              body: response.response.body,
              error: null,
              from: 'content-script'
            }
          }, '*');
        } else {
          // 没有匹配的规则或其他错误，让原始请求继续
          console.log('[Content Script] No rule matched or error for ID:', data.id, ', letting original request continue');
          window.postMessage({
            type: 'FORWARD_RESPONSE',
            data: {
              id: data.id,
              error: 'NO_RULE_MATCHED',
              matched: false,
              from: 'content-script'
            }
          }, '*');
        }
      });
    }

    // 处理响应记录
    if (type === 'INTERCEPT_RESPONSE') {
      console.log('[Content Script] INTERCEPT_RESPONSE received, ID:', data.id);
      chrome.runtime.sendMessage({
        type: 'INTERCEPT_RESPONSE',
        data: data,
        tabUrl: window.location.href
      });
    }

    // 处理错误记录
    if (type === 'INTERCEPT_ERROR') {
      console.log('[Content Script] INTERCEPT_ERROR received, ID:', data.id);
      chrome.runtime.sendMessage({
        type: 'INTERCEPT_ERROR',
        data: data,
        tabUrl: window.location.href
      });
    }
  } catch (error) {
    console.error('[Content Script] Error in message handler:', error);
  }
});

console.log('Content script loaded for:', window.location.href);
