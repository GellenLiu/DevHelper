function injectScript() {
  // 检查脚本是否已注入
  if (document.getElementById("devhelper-override-script")) return;

  const script = document.createElement("script");
  script.id = "devhelper-override-script";
  script.src = chrome.runtime.getURL(
    "./override-script.js"
  );
  script.type = "text/javascript";
  document.head.appendChild(script);
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

  // 处理获取环境配置变量请求
  if (event.data.type === "GET_ENV_CONFIGURATOR_VARIABLES") {
    // 从chrome.storage.local获取配置变量
    chrome.storage.local.get(["envConfiguratorVariables"], function(result) {
      // 发送响应回override-script.js
      window.postMessage({
        type: "ENV_CONFIGURATOR_VARIABLES",
        variables: result.envConfiguratorVariables
      }, "*");
    });
  }
});

// 监听来自chrome.runtime的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 处理获取环境配置请求
  console.log('request', request)

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
});

// 初始化函数
async function init() {
  console.log('content init', await isActive())
  const active = await isActive();
  if (active) {
    injectScript();
  }
}

init();

// 从chrome.storage.local获取插件开关状态
function isActive() {
  return new Promise((resolve) => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['isEnvConfiguratorActive'], function(result) {
        // 如果isEnvConfiguratorActive未设置，默认为true
        const active = result.isEnvConfiguratorActive !== undefined ? result.isEnvConfiguratorActive : true;
        resolve(active);
      });
    } else {
      console.error('Chrome storage API is not available');
      resolve(false); // 在API不可用的情况下，默认返回false
    }
  });
}
