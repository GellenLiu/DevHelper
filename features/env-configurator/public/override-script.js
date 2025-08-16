let envConfig = {};

// 根据配置的对象路径获取配置
async function getConfigsForObjects(objects) {
  const config = {};

  objects.forEach((path) => {
    // 解析对象路径，例如 "window.service_cf3_config"
    const parts = path.split(".");
    let current = window;

    for (let i = 1; i < parts.length; i++) {
      if (current[parts[i]] === undefined) {
        current = null;
        break;
      }
      current = current[parts[i]];
    }

    if (current) {
      config[path] = current;
    }
  });

  return config;
}

window.addEventListener("message", async function (event) {
  if (event.source !== window) return;

  // 接收来自content.js的配置
  if (event.data.action === "getEnvConfig") {
    const config = await getConfigsForObjects(event.data.objects);

    // 向content.js发送配置
    window.postMessage(
      {
        action: "returnEnvConfig",
        config: config,
      },
      "*"
    );
  }
});
