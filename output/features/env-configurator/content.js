function injectScript() {
  // 检查脚本是否已注入
  if (document.getElementById("devhelper-override-script")) return;

  const script = document.createElement("script");
  script.id = "devhelper-envconfigurator-override-script";
  script.src = chrome.runtime.getURL(
    "/features/env-configurator/override-script.js"
  );
  script.type = "text/javascript";
  document.documentElement.prepend(script);
}

// 监听来自override-script.js的消息
window.addEventListener("message", function (event) {
  if (event.source !== window) return;

  // 处理来自override-script.js的配置返回
  if (event.data.action === "returnEnvConfig") {
    // 将配置结果发送回chrome.runtime
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: "returnEnvConfig",
        config: event.data.config
      });
    }
  }

  if (event.data.action === 'GET_CONTENT_INFO') {
    // 从chrome.storage.local获取配置变量
    chrome.storage.local.get(["envConfiguratorSwitch"], function(result) {
      // 发送响应回override-script.js
      window.postMessage({
        action: "RETURN_CONTENT_INFO",
        switch: result.envConfiguratorSwitch
      }, "*");
    });
  }
});

// 监听来自chrome.runtime的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 处理获取环境配置请求
  if (request.action === "getEnvConfig") {
    // 向override-script.js发送获取配置请求
    window.postMessage({
      action: "getEnvConfig",
      objects: request.objects

    }, "*");

    // 设置临时监听器等待override-script.js的响应
    const handleResponse = function(event) {
      if (event.source !== window || event.data.action !== "returnEnvConfig") return;
      // 移除监听器
      window.removeEventListener("message", handleResponse);

      // 将结果发送回调用者
      sendResponse(event.data.config);
    };

    // 添加监听器
    window.addEventListener("message", handleResponse);

    // 必须返回true以保持消息通道开放
    return true;
  }

  if (request.action === "applyConfig") {
    // 向override-script.js发送获取配置请求
    window.postMessage({
      action: "applyConfig",
      config: request.config
    }, "*");
    return true;
  }

});

// 初始化函数
async function init() {
  const active = await isDomainActive();
  if (active) {
    injectScript();
  }
}

init();

async function isDomainActive() {
  return new Promise((resolve) => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['envConfiguratorDomains'], function(result) {
        let currentDomain = window.location.href;
        const domains = JSON.parse(result.envConfiguratorDomains || '["*"]');
         let active = domains.some(pattern => {
            if (!pattern) return false;
            
            // * 匹配所有域名
            if (pattern === '*') {
                return true;
            }

            if (currentDomain.includes(pattern)) {
                return true;
            }
            
            // 将通配符和正则表达式转换为有效的RegExp
            try {
                const regexPattern = pattern
                    .replace(/[\[\]\\\/.+?^${}()|]/g, '\\$&') // 转义正则特殊字符
                    .replace(/\*/g, '.*'); // 将*转换为.*
                const regex = new RegExp(`${regexPattern}`, 'i');
                return regex.test(currentDomain);
            } catch (error) {
                console.error(`Failed to create regex from pattern: ${pattern}. Error: ${error.message}`);
                return false;
            }
        });
        resolve(active);
      });
    } else {
      console.error('Chrome storage API is not available');
      resolve(false); // 在API不可用的情况下，默认返回false
    }
  });
}
