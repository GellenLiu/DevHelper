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

function cacheConfig(config) {
  window.sessionStorage.setItem("devHelper_envConfig", JSON.stringify(config));
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

  if (event.data.action === "applyConfig") {
    envConfig = event.data.config;
    cacheConfig(envConfig);

    window.location.reload();
  }
});

function getObjectFromPath(path) {
  const parts = path.split(".");
  let current = window;

  for (let i = 1; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) {
      return null;
    }
    current = current[parts[i]];
  }

  return current;
}

function overrideConfig(config) {
  Object.keys(config).forEach((key) => {
    const current = getObjectFromPath(key);
    const parts = key.split(".");
    console.log("current", current, parts[parts.length - 1], config[key]);
    Object.defineProperty(current, parts[parts.length - 1], {
      get: () => {
        return config[key];
      },
      set: (value) => {
        envConfig[key] = value;
      },
      enumerable: true,
      configurable: true,
    });
  });
}

function init() {
  const config = window.sessionStorage.getItem("devHelper_envConfig");
  if (config) {
    overrideConfig(JSON.parse(config));
  }
}

init();
