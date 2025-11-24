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
  window.postMessage({
    type: 'INTERCEPT_REQUEST',
    data: requestInfo
  }, '*');

  // 返回一个 Promise，等待来自 content script 的响应
  return new Promise((resolve, reject) => {
    // 监听来自 content script 的响应
    const responseListener = (event) => {
      if (event.source !== window) return;

      const { type, data } = event.data;
      if (type === 'FORWARD_RESPONSE' && data.id === requestId && data.from === 'content-script') {
        window.removeEventListener('message', responseListener);
        // 收到代理响应

        if (data.error === 'NO_RULE_MATCHED') {
          // 无匹配规则，使用原始请求
          originalFetch.apply(window, args)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (data.error) {
          // 代理请求失败，使用原始请求
          originalFetch.apply(window, args)
            .then(resolve)
            .catch(reject);
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

  // 监听来自 content script 的代理响应
  const responseListener = (event) => {
    if (event.source !== window) return;

    const { type, data } = event.data;
    if (type === 'FORWARD_RESPONSE' && data.id === requestId && data.from === 'content-script') {
      window.removeEventListener('message', responseListener);
      // 收到代理响应
      proxyResponseReceived = true;

      if (data.error === 'NO_RULE_MATCHED') {
        // 无规则匹配
        shouldExecuteOriginal = true;
        return;
      }

      // 有规则匹配，立即用代理响应替换 XHR 状态
      // 注入代理响应
      shouldExecuteOriginal = false;

      // 强制设置 XHR 对象的属性为代理响应
      try {
        // 定义 configurable 为 true，允许重新定义
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

        // 设置响应体
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

        // 模拟 readystatechange 事件到第 3 然后第 4
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

        // 最后触发完成状态
        setTimeout(() => {
          Object.defineProperty(xhr, 'readyState', { value: 4, writable: false, configurable: true });
          
          if (xhr.onreadystatechange) {
            try {
              // 触发最终状态
              xhr.onreadystatechange({ type: 'readystatechange', target: xhr });
            } catch (e) {
              console.error('⚠️ XHR 最终状态失败');
            }
          }

          if (xhr.onload) {
            try {
              // 触发 onload
              xhr.onload({ type: 'load', target: xhr });
            } catch (e) {
              console.error('⚠️ XHR onload 失败');
            }
          }

          try {
            // 触发 loadend
            xhr.dispatchEvent(new ProgressEvent('loadend'));
          } catch (e) {
            console.error('⚠️ XHR loadend 失败');
          }
        }, 20);

        // 代理响应已注入
      } catch (error) {
        console.error('⚠️ XHR 注入代理响应失败');
      }
    }
  };

  window.addEventListener('message', responseListener);

  // 10 秒超时
  const timeoutId = setTimeout(() => {
    if (!proxyResponseReceived) {
      console.log('[XHR] Timeout waiting for proxy response, ID:', requestId);
      window.removeEventListener('message', responseListener);
      shouldExecuteOriginal = true;
    }
  }, 10000);

  // 执行原始请求
  console.log('[XHR] Executing original request');
  return originalSend.call(xhr, body);
};

// 不需要额外的 message listener，因为 Fetch 和 XHR 都直接监听 FORWARD_RESPONSE

console.log('Injected script loaded and hooks installed');

