/**
 * injected.js - 注入到页面中的脚本，用于拦截 XHR 和 Fetch 请求
 * 这个脚本直接运行在页面的上下文中，可以访问原始的 fetch 和 XMLHttpRequest
 */

// 保存原始的 fetch 和 XMLHttpRequest
const originalFetch = window.fetch;
const OriginalXMLHttpRequest = window.XMLHttpRequest;

// 存储拦截的请求映射（用于匹配响应）
const requestMap = new Map();

// 拦截 Fetch 请求
window.fetch = function(...args) {
  const [resource, config] = args;
  const requestUrl = typeof resource === 'string' ? resource : resource.url;
  const requestId = Date.now() + Math.random();

  // 构建请求信息
  const requestInfo = {
    id: requestId,
    type: 'fetch',
    url: requestUrl,
    method: (config?.method || 'GET').toUpperCase(),
    headers: config?.headers || {},
    body: config?.body,
    timestamp: new Date().toISOString()
  };

  // 发送请求信息到 content script
  console.log('[Fetch] Posting INTERCEPT_REQUEST, ID:', requestId, 'URL:', requestUrl);
  window.postMessage({
    type: 'INTERCEPT_REQUEST',
    data: requestInfo
  }, '*');

  // 返回一个 Promise，等待来自 content script 的响应
  return new Promise((resolve, reject) => {
    let responseListener;
    responseListener = (event) => {
      console.log('[Fetch] Received message event:', event.data?.type, 'from', event.data?.from);
        if (event.source !== window) return;

        const { type, data } = event.data;
        if (type === 'FORWARD_RESPONSE' && data.id === requestId && data.from === 'content-script') {
          window.removeEventListener('message', responseListener);
          // 收到代理响应
          console.log('[Fetch] FORWARD_RESPONSE received for ID:', requestId, 'error:', data.error);
          const fallbackToOrigin = data.fallbackToOrigin !== false;

          if (data.error === 'NO_RULE_MATCHED') {
            // 无匹配规则，使用原始请求
            console.log('[Fetch] No rule matched for ID:', requestId, 'using original request');
            originalFetch.apply(window, args)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (data.error) {
            // 代理请求失败，根据设置决定是否回源
            if (fallbackToOrigin) {
              console.log('代理失败，自动回源');
              originalFetch.apply(window, args)
                .then(resolve)
                .catch(reject);
            } else {
              console.log('代理失败，直接返回错误');
              // 构建错误响应
              const errorResponse = new Response(JSON.stringify({ error: data.error }), {
                status: 502,
                statusText: '代理失败',
                headers: { 'Content-Type': 'application/json' }
              });
              resolve(errorResponse);
            }
            return;
          }

          // 构建 Response 对象
          const responseInit = {
            status: data.status,
            statusText: data.statusText,
            headers: data.headers || {}
          };

          const responseBody = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
          let response;
          try {
            response = new Response(responseBody, responseInit);
            // 代理响应已注入
          } catch (e) {
            console.error('⚠️ Fetch 创建响应失败');
            // 如果创建失败，尝试不带 headers
            response = new Response(responseBody, { 
              status: data.status, 
              statusText: data.statusText 
            });
          }
          // 返回代理响应
          console.log('[Fetch] Resolving with forwarded response for ID:', requestId, 'status:', data.status);
          resolve(response);
        }
      };

      window.addEventListener('message', responseListener);

      // 5 秒超时
      setTimeout(() => {
        if (window.removeEventListener) {
          window.removeEventListener('message', responseListener);
        }
        console.warn('⏱️ Fetch 超时');
        // 超时则执行原始请求
        originalFetch.apply(window, args)
          .then(resolve)
          .catch(reject);
      }, 5000);
    });
};

// 拦截 XMLHttpRequest
const XHRPrototype = OriginalXMLHttpRequest.prototype;
const originalOpen = XHRPrototype.open;
const originalSend = XHRPrototype.send;
const originalSetRequestHeader = XHRPrototype.setRequestHeader;

XHRPrototype.open = function(method, url) {
  this.__method = method;
  this.__url = url;
  this.__startTime = new Date().toISOString();
  this.__requestHeaders = {};
  this.__requestId = Date.now() + Math.random();
  return originalOpen.apply(this, arguments);
};

XHRPrototype.setRequestHeader = function(header, value) {
  if (!this.__requestHeaders) {
    this.__requestHeaders = {};
  }
  this.__requestHeaders[header] = value;
  return originalSetRequestHeader.apply(this, arguments);
};

XHRPrototype.send = function(body) {
  const xhr = this;
  const requestId = xhr.__requestId;
  let proxyResponseReceived = false;
  let shouldExecuteOriginal = true;

  // 记录请求
  console.log('[XHR] Posting INTERCEPT_REQUEST, ID:', requestId, 'URL:', xhr.__url);
  window.postMessage({
    type: 'INTERCEPT_REQUEST',
    data: {
      id: requestId,
      type: 'xhr',
      url: xhr.__url,
      method: (xhr.__method || 'GET').toUpperCase(),
      headers: xhr.__requestHeaders || {},
      body: body,
      timestamp: xhr.__startTime
    }
  }, '*');

  // 保存原始的 onreadystatechange 处理器
  const originalOnReadyStateChange = xhr.onreadystatechange;
  let originalResponseReceived = false;

  // 拦截 readystatechange - 防止原始响应覆盖代理响应
  xhr.onreadystatechange = function() {
    // XHR 状态变化
    
    // 如果已经收到代理响应，忽略原始响应
    if (proxyResponseReceived) {
      // 忽略原始响应，使用代理
      return;
    }
    
    // 记录原始响应完成
    if (xhr.readyState === 4) {
      originalResponseReceived = true;
      // 原始响应接收
    }
    
    // 调用原始处理器
    if (originalOnReadyStateChange) {
      try {
        originalOnReadyStateChange.call(this);
      } catch (e) {
        console.error('⚠️ XHR onreadystatechange 错误');
      }
    }
  };


  // 监听来自 content script 的代理响应，支持 fallbackToOrigin 设置
  let responseListener;
  responseListener = (event) => {
      if (event.source !== window) return;

      const { type, data } = event.data;
      if (type === 'FORWARD_RESPONSE' && data.id === requestId && data.from === 'content-script') {
        window.removeEventListener('message', responseListener);
        // 收到代理响应
        proxyResponseReceived = true;

        const fallbackToOrigin = data.fallbackToOrigin !== false;
        if (data.error === 'NO_RULE_MATCHED') {
          // 无规则匹配
          shouldExecuteOriginal = true;
          return;
        }

        if (data.error) {
          // 代理请求失败，根据设置决定是否回源
          if (fallbackToOrigin) {
            console.log('代理失败，自动回源');
            shouldExecuteOriginal = true;
          } else {
            console.log('代理失败，直接返回错误');
            shouldExecuteOriginal = false;
            // 构建错误响应
            try {
              Object.defineProperty(xhr, 'readyState', {
                value: 4,
                writable: false,
                configurable: true
              });
              Object.defineProperty(xhr, 'status', {
                value: 502,
                writable: false,
                configurable: true
              });
              Object.defineProperty(xhr, 'statusText', {
                value: '代理失败',
                writable: false,
                configurable: true
              });
              Object.defineProperty(xhr, 'responseText', {
                value: JSON.stringify({ error: data.error }),
                writable: false,
                configurable: true
              });
              Object.defineProperty(xhr, 'response', {
                value: { error: data.error },
                writable: false,
                configurable: true
              });
              setTimeout(() => {
                Object.defineProperty(xhr, 'readyState', { value: 3, writable: false, configurable: true });
                if (xhr.onreadystatechange) {
                  try {
                    xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
                  } catch (e) {
                    console.error('⚠️ XHR onreadystatechange 失败');
                  }
                }
              }, 10);
              setTimeout(() => {
                Object.defineProperty(xhr, 'readyState', { value: 4, writable: false, configurable: true });
                if (xhr.onreadystatechange) {
                  try {
                    xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
                  } catch (e) {
                    console.error('⚠️ XHR 最终状态失败');
                  }
                }
                if (xhr.onload) {
                  try {
                    xhr.onload({ type: 'load', target: xhr });
                  } catch (e) {
                    console.error('⚠️ XHR onload 失败');
                  }
                }
                try {
                  xhr.dispatchEvent(new ProgressEvent('loadend'));
                } catch (e) {
                  console.error('⚠️ XHR loadend 失败');
                }
              }, 20);
            } catch (error) {
              console.error('⚠️ XHR 注入错误响应失败');
            }
          }
          return;
        }

        // 有规则匹配，立即用代理响应替换 XHR 状态
        shouldExecuteOriginal = false;
        try {
          Object.defineProperty(xhr, 'readyState', {
            value: 4,
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'status', {
            value: data.status,
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'statusText', {
            value: data.statusText || 'OK',
            writable: false,
            configurable: true
          });
          const responseBody = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
          Object.defineProperty(xhr, 'responseText', {
            value: responseBody,
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'response', {
            value: data.body,
            writable: false,
            configurable: true
          });
          setTimeout(() => {
            Object.defineProperty(xhr, 'readyState', { value: 3, writable: false, configurable: true });
            if (xhr.onreadystatechange) {
              try {
                xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
              } catch (e) {
                console.error('⚠️ XHR onreadystatechange 失败');
              }
            }
          }, 10);
          setTimeout(() => {
            Object.defineProperty(xhr, 'readyState', { value: 4, writable: false, configurable: true });
            if (xhr.onreadystatechange) {
              try {
                xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
              } catch (e) {
                console.error('⚠️ XHR 最终状态失败');
              }
            }
            if (xhr.onload) {
              try {
                xhr.onload({ type: 'load', target: xhr });
              } catch (e) {
                console.error('⚠️ XHR onload 失败');
              }
            }
            try {
              xhr.dispatchEvent(new ProgressEvent('loadend'));
            } catch (e) {
              console.error('⚠️ XHR loadend 失败');
            }
          }, 20);
        } catch (error) {
          console.error('⚠️ XHR 注入代理响应失败');
        }
      }
    };

    window.addEventListener('message', responseListener);
    console.log('[XHR] Listening for FORWARD_RESPONSE for ID:', requestId);

  // 10 秒超时
  const timeoutId = setTimeout(() => {
    if (!proxyResponseReceived) {
      console.log('[XHR] Timeout waiting for proxy response, ID:', requestId);
      window.removeEventListener('message', responseListener);
      shouldExecuteOriginal = true;
    }
  }, 10000);

  // 只有在没有收到代理响应或者代理响应指示需要回源时，才执行原始请求
  if (shouldExecuteOriginal) {
    console.log('[XHR] Executing original request');
    return originalSend.call(xhr, body);
  } else {
    // 已经有代理响应，不需要执行原始请求
    console.log('[XHR] Using proxy response, skipping original request');
    return undefined;
  }
};

// 不需要额外的 message listener，因为 Fetch 和 XHR 都直接监听 FORWARD_RESPONSE

console.log('Injected script loaded and hooks installed');
// 向 content script 发送加载完成的通知，便于建立握手
try {
  window.postMessage({ type: 'INJECTED_LOADED', from: 'injected' }, '*');
} catch (e) {
  console.warn('Failed to post INJECTED_LOADED message', e);
}

// 监听 content script 的 ACK
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const { type } = event.data || {};
  if (type === 'INJECTED_ACK') {
    console.log('[Injected] Received INJECTED_ACK from content-script');
  }
});

