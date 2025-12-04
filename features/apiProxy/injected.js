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
    let responseListener;
    responseListener = (event) => {
        if (event.source !== window) return;

        const { type, data } = event.data;
        if (type === 'FORWARD_RESPONSE' && data.id === requestId && data.from === 'content-script') {
          window.removeEventListener('message', responseListener);
          // 收到代理响应
          const fallbackToOrigin = data.fallbackToOrigin !== false;

          if (data.error === 'NO_RULE_MATCHED') {
            // 无匹配规则，使用原始请求
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
          const responseBody = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
          const responseHeaders = data.headers || {};
          
          // 尝试使用标准方式创建 Response 对象
          let response;
          try {
            // 确保 headers 是有效的 Headers 对象或可序列化的对象
            const headersInit = responseHeaders instanceof Headers ? responseHeaders : responseHeaders;
            response = new Response(responseBody, {
              status: data.status,
              statusText: data.statusText,
              headers: headersInit
            });
          } catch (e) {
            console.error('[Fetch] Failed to create Response with headers, trying alternative approach:', e);
            
            // 如果直接创建失败，尝试手动构建带有 headers 的 Response
            response = new Response(responseBody, {
              status: data.status,
              statusText: data.statusText
            });
            
            // 虽然 Response headers 是只读的，但我们可以尝试修改原型或使用其他方式
            // 注意：这种方式可能在某些浏览器中不起作用，但值得尝试
            if (typeof Object.defineProperty === 'function' && response.headers) {
              try {
                // 尝试重写 get 和 getAll 方法
                const originalGet = response.headers.get;
                const originalGetAll = response.headers.getAll;
                const originalEntries = response.headers.entries;
                
                Object.defineProperty(response.headers, 'get', {
                  value: function(header) {
                    const normalizedHeader = header.toLowerCase();
                    for (const [key, value] of Object.entries(responseHeaders)) {
                      if (key.toLowerCase() === normalizedHeader) {
                        return value;
                      }
                    }
                    return originalGet.call(this, header);
                  },
                  writable: true,
                  configurable: true
                });
                
                Object.defineProperty(response.headers, 'getAll', {
                  value: function(header) {
                    const normalizedHeader = header.toLowerCase();
                    const values = [];
                    for (const [key, value] of Object.entries(responseHeaders)) {
                      if (key.toLowerCase() === normalizedHeader) {
                        values.push(value);
                      }
                    }
                    if (values.length > 0) {
                      return values;
                    }
                    return originalGetAll.call(this, header);
                  },
                  writable: true,
                  configurable: true
                });
                
                Object.defineProperty(response.headers, 'entries', {
                  value: function() {
                    const headerEntries = Object.entries(responseHeaders);
                    if (headerEntries.length > 0) {
                      return headerEntries[Symbol.iterator]();
                    }
                    return originalEntries.call(this);
                  },
                  writable: true,
                  configurable: true
                });
              } catch (e2) {
                console.error('[Fetch] Failed to modify Response headers methods:', e2);
              }
            }
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
      originalOnReadyStateChange.call(this);
      console.log('proxyResponseReceived', proxyResponseReceived)
      return;
    }
    
    // 调用原始处理器
    if (originalOnReadyStateChange) {
      try {
        console.log('originalOnReadyStateChange', xhr.readyState, xhr.__url)
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
    
    return originalSend.call(xhr, body);
  };

  // 构建并返回代理响应
  const buildProxyResponse = (status, statusText, responseBody, responseObj, headers) => {
    proxyResponseReceived = true;
    
    // 清理事件监听器和超时
    if (responseListener) {
      window.removeEventListener('message', responseListener);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    try {
      // 1. 先设置所有必要的 XHR 属性
      // 注意：这里需要按照 XHR 规范的顺序设置属性
      
      // 设置 responseURL（如果有）
      if (xhr.__url) {
        Object.defineProperty(xhr, 'responseURL', {
          value: xhr.__url,
          writable: false,
          configurable: true
        });
      }
      
      // 设置 status 和 statusText
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
      
      // 设置响应头
      Object.defineProperty(xhr, 'getResponseHeader', {
        value: function(header) {
          if (!headers) return null;
          const normalizedHeader = header.toLowerCase();
          for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === normalizedHeader) {
              return value;
            }
          }
          return null;
        },
        writable: false,
        configurable: true
      });
      
      Object.defineProperty(xhr, 'getAllResponseHeaders', {
        value: function() {
          if (!headers) return '';
          return Object.entries(headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\r\n');
        },
        writable: false,
        configurable: true
      });
      
      Object.defineProperty(xhr, 'responseType', {
        value: 'text',
        writable: false,
        configurable: true
      });
      
      // 设置 response 和 responseText
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
      
      // 设置 responseXML（如果响应是 XML）
      if (responseBody && responseBody.startsWith('<?xml')) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(responseBody, 'text/xml');
          Object.defineProperty(xhr, 'responseXML', {
            value: xmlDoc,
            writable: false,
            configurable: true
          });
        } catch (e) {
          // 如果解析失败，设置为 null
          Object.defineProperty(xhr, 'responseXML', {
            value: null,
            writable: false,
            configurable: true
          });
        }
      } else {
        Object.defineProperty(xhr, 'responseXML', {
          value: null,
          writable: false,
          configurable: true
        });
      }
      
      // 设置 readyState 为 3（加载中）
      Object.defineProperty(xhr, 'readyState', {
        value: 3,
        writable: false,
        configurable: true
      });
      
      // 2. 触发 readyState 3 的 readystatechange 事件
      // 先触发 onreadystatechange 属性
      if (xhr.onreadystatechange) {
        try {
          xhr.onreadystatechange.call(xhr);
        } catch (e) {
          console.error('⚠️ XHR onreadystatechange (loading) failed:', e);
        }
      }
      // 再触发通过 addEventListener 添加的 readystatechange 事件
      try {
        xhr.dispatchEvent(new Event('readystatechange'));
      } catch (e) {
        console.error('⚠️ XHR dispatch readystatechange (loading) failed:', e);
      }
      
      // 3. 延迟一小段时间，设置 readyState 为 4（完成）
      setTimeout(() => {
        // 设置 readyState 为 4（完成）
        Object.defineProperty(xhr, 'readyState', {
          value: 4,
          writable: false,
          configurable: true
        });
        
        // 4. 触发 readyState 4 的 readystatechange 事件
        // 先触发 onreadystatechange 属性
        if (xhr.onreadystatechange) {
          try {
            xhr.onreadystatechange.call(xhr);
          } catch (e) {
            console.error('⚠️ XHR onreadystatechange (done) failed:', e);
          }
        }
        // 再触发通过 addEventListener 添加的 readystatechange 事件
        try {
          xhr.dispatchEvent(new Event('readystatechange'));
        } catch (e) {
          console.error('⚠️ XHR dispatch readystatechange (done) failed:', e);
        }
        
        // 5. 触发 load 事件
        // 先触发 onload 属性
        if (xhr.onload) {
          try {
            xhr.onload.call(xhr);
          } catch (e) {
            console.error('⚠️ XHR onload failed:', e);
          }
        }
        // 再触发通过 addEventListener 添加的 load 事件
        try {
          xhr.dispatchEvent(new Event('load'));
        } catch (e) {
          console.error('⚠️ XHR dispatch load failed:', e);
        }
        
        // 6. 触发 loadend 事件
        try {
          xhr.dispatchEvent(new ProgressEvent('loadend'));
        } catch (e) {
          console.error('⚠️ XHR loadend event failed:', e);
        }
        
        // 7. 触发其他可能的事件（根据状态）
        // 如果请求成功（2xx），可以考虑触发其他成功相关的事件
        if (status >= 200 && status < 300) {
          // 例如，可以触发 onloadstart 事件（如果需要）
          // 但通常 loadstart 是在请求开始时触发的，这里可能不需要
        }
        // 如果请求失败，可以考虑触发 error 事件
        if (status >= 400) {
          // 触发 onerror 属性
          if (xhr.onerror) {
            try {
              xhr.onerror.call(xhr);
            } catch (e) {
              console.error('⚠️ XHR onerror failed:', e);
            }
          }
          // 触发通过 addEventListener 添加的 error 事件
          try {
            xhr.dispatchEvent(new Event('error'));
          } catch (e) {
            console.error('⚠️ XHR dispatch error failed:', e);
          }
        }
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
        executeOriginalRequest();
      } else {
        // 构建错误响应
        const errorResponse = JSON.stringify({ error: data.error });
        buildProxyResponse(502, 'Proxy Error', errorResponse, { error: data.error }, data.headers);
      }
      return;
    }
    
    // 有规则匹配，返回代理响应
    const responseBody = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
    buildProxyResponse(data.status, data.statusText || 'OK', responseBody, data.body, data.headers);
  };

  // 监听代理响应
  responseListener = (event) => {
    if (event.source !== window) return;
    handleProxyResponse(event);
  };

  window.addEventListener('message', responseListener);

  // 10 秒超时处理
  timeoutId = setTimeout(() => {
    if (!proxyResponseReceived) {
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

