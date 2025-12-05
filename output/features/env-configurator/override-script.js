let envConfig = {};
const TEMP_CONFIG_KEY = "devHelper_envConfig";
const overriderSwitch = false;

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
  window.sessionStorage.setItem(TEMP_CONFIG_KEY, JSON.stringify(config));
}

window.addEventListener("message", async function (event) {
  if (event.source !== window) return;

  const handler = messageHandlers[event.data.action];
  handler && handler(event);
});

const messageHandlers = {
  getEnvConfig: async (event) => {
    const config = await getConfigsForObjects(event.data.objects);
    // 向content.js发送配置
    window.postMessage(
      {
        action: "returnEnvConfig",
        config: config,
      },
      "*"
    );
  },
  applyConfig: (event) => {
    envConfig = event.data.config;
    cacheConfig(envConfig);
    window.location.reload();
  },
};

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

async function getContentInfo() {
  return new Promise((resolve, reject) => {
    window.addEventListener("message", function (event) {
      if (event.source !== window) return;
      if (event.data.action === "RETURN_CONTENT_INFO") {
        resolve(event.data);
      }
    });
    window.postMessage(
      {
        action: "GET_CONTENT_INFO",
      },
      "*"
    );
  });
}

async function initOverride() {
  let contentInfo = await getContentInfo();
  if (contentInfo.switch) {
    const config = window.sessionStorage.getItem(TEMP_CONFIG_KEY);
    if (config) {
      overrideConfig(JSON.parse(config));
    }
  }
}
initOverride();
