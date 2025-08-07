// 注入错误监控脚本到页面
function injectErrorScript() {
  // 检查脚本是否已注入
  if (document.getElementById("devui-error-monitor-script")) return;

  const script = document.createElement("script");
  script.id = "devui-error-monitor-script";
  script.src = chrome.runtime.getURL(
    "features/js-error-monitor/error-script.js"
  );
  script.type = "text/javascript";
  // 脚本加载完成后发送配置
  script.onload = function () {
    loadAndSendConfig();
  };
  document.head.appendChild(script);
}

// 从storage加载配置并发送给注入脚本
function loadAndSendConfig() {
  chrome.storage.local.get("jsErrorMonitorConfig", (result) => {
    const config = result.jsErrorMonitorConfig || {
      enabled: false,
      monitoredDomains: [],
      errorTypes: {
        windowError: true,
        errorEvent: true,
        unhandledRejection: true,
        consoleError: true,
      },
    };

    // 发送配置到注入脚本
    window.postMessage(
      {
        type: "DEVUI_JS_ERROR_MONITOR_CONFIG",
        config: config,
      },
      "*"
    );
  });
}

// 初始化
// 立即设置消息监听器，不等待DOMContentLoaded
window.addEventListener("message", (event) => {
  // 允许来自页面的消息
  if (event.source !== window) {
    // 仅处理我们识别的消息类型
    if (
      !event.data.type ||
      !event.data.type.startsWith("DEVUI_JS_ERROR_MONITOR_")
    ) {
      return;
    }
  }

  // 处理错误消息
  if (event.data.type === "DEVUI_JS_ERROR_OCCURRED") {
    // 这里可以添加错误上报逻辑
  }
  // 响应配置请求
  else if (event.data.type === "DEVUI_JS_ERROR_MONITOR_GET_CONFIG") {
    loadAndSendConfig();
  }
});

function init() {
  // 先加载配置，根据配置决定是否注入脚本
  chrome.storage.local.get("jsErrorMonitorConfig", (result) => {
    const config = result.jsErrorMonitorConfig || {
      enabled: false,
      monitoredDomains: [],
      errorTypes: {
        windowError: true,
        errorEvent: true,
        unhandledRejection: true,
        consoleError: true,
      },
    };

    // 只有启用时才注入脚本
    if (config.enabled) {
      injectErrorScript();
    }

    // 监听来自扩展的配置更新消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "JS_ERROR_MONITOR_CONFIG_UPDATED") {
        // 将更新的配置发送给注入脚本
        window.postMessage(
          {
            type: "DEVUI_JS_ERROR_MONITOR_CONFIG",
            config: message.config,
          },
          "*"
        );
      }
    });
  });
}

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
