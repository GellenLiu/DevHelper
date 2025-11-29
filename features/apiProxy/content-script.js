/**
 * content-script.js - 内容脚本，运行在页面和插件之间的桥梁
 * 负责注入脚本、转发消息、处理请求转发
 */

// 注入 injected.js 脚本到页面
function injectScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() { this.remove(); };
    script.onerror = function() { console.error('Failed to load injected script'); this.remove(); };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('Error injecting script:', error);
  }
}

// 记录当前活跃的规则
let activeRules = [];
let handshakeReceived = false;

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
    // 诊断：打印接收到的消息类型
    try { console.log('[Content Script] window.message received:', event.data?.type, 'id:', event.data?.data?.id); } catch (e) {}

    const { type, data } = event.data;

    // 如果注入脚本通知已加载，回个 ack
    if (type === 'INJECTED_LOADED') {
      console.log('[Content Script] Received INJECTED_LOADED, sending ACK', event.data);
      window.postMessage({ type: 'INJECTED_ACK', from: 'content-script' }, '*');
      handshakeReceived = true;
      return;
    }

    try {
      // 处理请求拦截
      if (type === 'INTERCEPT_REQUEST') {
        console.log('[Content Script] INTERCEPT_REQUEST received, ID:', data.id, 'URL:', data.url);
        // 发送请求信息到 background script
        chrome.runtime.sendMessage({ type: 'INTERCEPT_REQUEST', data: data, tabUrl: window.location.href }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Content Script] chrome.runtime.lastError:', chrome.runtime.lastError);
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, error: 'BACKGROUND_ERROR: ' + chrome.runtime.lastError.message, from: 'content-script' } }, '*');
            return;
          }

          if (!response) {
            console.warn('[Content Script] Empty response from background for ID:', data.id);
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, error: 'EMPTY_RESPONSE', from: 'content-script' } }, '*');
            return;
          }

          if (response && response.matched && response.response) {
            // 如果请求被转发，将代理响应发送回 injected script
            console.log('[Content Script] Sending FORWARD_RESPONSE for ID:', data.id, 'status:', response.response.status);
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, status: response.response.status, statusText: response.response.statusText, headers: response.response.headers || {}, body: response.response.body, error: null, fallbackToOrigin: response.fallbackToOrigin !== false, from: 'content-script' } }, '*');
          } else {
            // 没有匹配的规则或其他错误，让原始请求继续
            console.log('[Content Script] No rule matched or error for ID:', data.id, ', letting original request continue');
            try {
              chrome.runtime.sendMessage({ type: 'GET_RULES' }, (resp) => {
                if (resp && resp.rules) {
                  console.info('[Content Script] Current rules for debugging:', resp.rules);
                  // 显示所有规则的详细信息
                  resp.rules.forEach((rule, index) => {
                    console.info(`[Content Script] Rule ${index + 1}:`, {
                      id: rule.id,
                      name: rule.name,
                      enabled: rule.enabled,
                      sourcePattern: rule.sourcePattern,
                      targetUrl: rule.targetUrl,
                      method: rule.method
                    });
                  });
                }
              });
            } catch (e) {
              console.error('[Content Script] Failed to fetch rules for debugging:', e);
            }
            window.postMessage({ type: 'FORWARD_RESPONSE', data: { id: data.id, error: 'NO_RULE_MATCHED', matched: false, fallbackToOrigin: response?.fallbackToOrigin !== false, from: 'content-script' } }, '*');
          }
        });
      }

      // 处理响应记录
      if (type === 'INTERCEPT_RESPONSE') {
        console.log('[Content Script] INTERCEPT_RESPONSE received, ID:', data.id);
        chrome.runtime.sendMessage({ type: 'INTERCEPT_RESPONSE', data: data, tabUrl: window.location.href });
      }

      // 处理错误记录
      if (type === 'INTERCEPT_ERROR') {
        console.log('[Content Script] INTERCEPT_ERROR received, ID:', data.id);
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

// 如果在注入后一定时间内没有收到 handshake，打印诊断信息
setTimeout(() => {
  if (!handshakeReceived) {
    console.warn('[Content Script] No INJECTED_LOADED handshake received after injection');
  }
}, 1500);

console.log('Content script loaded for:', window.location.href);
