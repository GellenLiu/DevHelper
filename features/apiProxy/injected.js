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
  let originalRequestSent = false;
  let responseListener = null;
  let timeoutId = null;

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

  // 拦截 readystatechange - 防止原始响应覆盖代理响应
  xhr.onreadystatechange = function() {
    // 如果已经收到代理响应，忽略原始响应
    if (proxyResponseReceived) {
      return;
    }
    
    // 调用原始处理器
    if (originalOnReadyStateChange) {
      try {
        originalOnReadyStateChange.call(this);
      } catch (e) {
      }
    }
  };

  // 执行原始请求
  const executeOriginalRequest = () => {
    if (originalRequestSent) {
      return;
    }
    originalRequestSent = true;
    
    // 清理事件监听器和超时
    if (responseListener) {
      window.removeEventListener('message', responseListener);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    console.log('[XHR] Executing original request');
    return originalSend.call(xhr, body);
  };

  // 构建并返回代理响应
  const buildProxyResponse = (status, statusText, responseBody, responseObj) => {
    proxyResponseReceived = true;
    
    // 清理事件监听器和超时
    if (responseListener) {
      window.removeEventListener('message', responseListener);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    try {
      // 模拟 XHR 状态变化，先设置为 3（加载中），再设置为 4（完成）
      setTimeout(() => {
        Object.defineProperty(xhr, 'readyState', {
          value: 3,
          writable: false,
          configurable: true
        });
        // 触发 readystatechange 事件（loading 状态）
        if (xhr.onreadystatechange) {
          try {
            xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
          } catch (e) {
            console.error('⚠️ XHR onreadystatechange (loading) failed:', e);
          }
        }
        
        // 再延迟一小段时间，设置为完成状态
        setTimeout(() => {
          Object.defineProperty(xhr, 'readyState', {
            value: 4,
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'status', {
            value: status,
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'statusText', {
            value: statusText || 'OK',
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'responseText', {
            value: responseBody,
            writable: false,
            configurable: true
          });
          Object.defineProperty(xhr, 'response', {
            value: responseObj || responseBody,
            writable: false,
            configurable: true
          });
          
          // 触发 readystatechange 事件（完成状态）
          if (xhr.onreadystatechange) {
            try {
              xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
            } catch (e) {
              console.error('⚠️ XHR onreadystatechange (done) failed:', e);
            }
          }
          
          // 触发 onload 事件
          if (xhr.onload) {
            try {
              xhr.onload({ type: 'load', target: xhr });
            } catch (e) {
              console.error('⚠️ XHR onload failed:', e);
            }
          }
          
          // 触发 loadend 事件
          try {
            xhr.dispatchEvent(new ProgressEvent('loadend'));
          } catch (e) {
            console.error('⚠️ XHR loadend event failed:', e);
          }
        }, 20);
      }, 10);
    } catch (error) {
      console.error('⚠️ XHR proxy response build failed:', error);
      // 构建失败，回退到原始请求
      executeOriginalRequest();
    }
  };

  // 处理代理响应
  const handleProxyResponse = (event) => {
    const { type, data } = event.data || {};
    if (type !== 'FORWARD_RESPONSE' || data?.id !== requestId || data?.from !== 'content-script') {
      return;
    }
    
    const fallbackToOrigin = data.fallbackToOrigin !== false;
    
    if (data.error === 'NO_RULE_MATCHED') {
      // 无规则匹配，执行原始请求
      console.log('[XHR] No rule matched, executing original request');
      executeOriginalRequest();
      return;
    }
    
    if (data.error) {
      // 代理请求失败，根据设置决定是否回源
      if (fallbackToOrigin) {
        console.log('[XHR] Proxy failed, falling back to original request');
        executeOriginalRequest();
      } else {
        console.log('[XHR] Proxy failed, returning error directly');
        // 构建错误响应
        const errorResponse = JSON.stringify({ error: data.error });
        buildProxyResponse(502, 'Proxy Error', errorResponse, { error: data.error });
      }
      return;
    }
    
    // 有规则匹配，返回代理响应
    console.log('[XHR] Proxy response received, using proxy response');
    const responseBody = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
    buildProxyResponse(data.status, data.statusText || 'OK', responseBody, data.body);
  };

  // 监听代理响应
  responseListener = (event) => {
    if (event.source !== window) return;
    handleProxyResponse(event);
  };

  window.addEventListener('message', responseListener);
  console.log('[XHR] Listening for FORWARD_RESPONSE for ID:', requestId);

  // 10 秒超时处理
  timeoutId = setTimeout(() => {
    if (!proxyResponseReceived) {
      console.log('[XHR] Timeout waiting for proxy response, executing original request');
      executeOriginalRequest();
    }
  }, 10000);

  // 初始状态下，不立即执行原始请求，等待代理响应
  // 只有在代理响应失败、超时或无规则匹配时，才会执行原始请求
};

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

