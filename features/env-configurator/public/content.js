function injectScript() {
  // 检查脚本是否已注入
  if (document.getElementById("devhelper-override-script")) return;

  const script = document.createElement("script");
  script.id = "devhelper-override-script";
  script.src = chrome.runtime.getURL(
    "features/env-configurator/override-script.js"
  );
  script.type = "text/javascript";
  // 脚本加载完成后发送配置
  script.onload = function () {
    loadAndSendConfig();
  };
  document.head.appendChild(script);
}