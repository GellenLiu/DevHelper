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

// 存储需要延迟劫持的配置
const pendingOverrides = new Map();

// 监听对象路径的变化
function observePathForOverride(path, targetValue) {
  if (pendingOverrides.has(path)) return;
  
  const parts = path.split(".");
  let current = window;
  let observedPath = "window";
  
  // 尝试找到可以监听的最近对象
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    observedPath += "." + part;
    
    if (current[part] === undefined) {
      // 对当前对象添加代理来监听子属性的创建
      const proxyHandler = {
        set: function(obj, prop, value) {
          obj[prop] = value;
          // 如果创建的属性是我们等待的部分，检查是否可以完成劫持
          if (prop === part && i === parts.length - 2) {
            checkAndApplyPendingOverride(path, targetValue);
          }
          return true;
        }
      };
      
      // 如果当前对象不是代理，创建一个代理
      if (!current.__isProxy) {
        const originalObj = current;
        current = new Proxy(originalObj, proxyHandler);
        current.__isProxy = true;
        
        // 向上设置代理
        if (i > 1) {
          const parentParts = observedPath.split(".").slice(0, -1);
          let parent = window;
          for (let j = 1; j < parentParts.length; j++) {
            parent = parent[parentParts[j]];
          }
          parent[part] = current;
        }
      }
      
      // 添加到待处理列表
      pendingOverrides.set(path, targetValue);
      return;
    }
    current = current[part];
  }
  
  // 如果路径已存在，直接应用劫持
  checkAndApplyPendingOverride(path, targetValue);
}

// 检查并应用待处理的劫持
function checkAndApplyPendingOverride(path, targetValue) {
  const current = getObjectFromPath(path);
  if (current) {
    const parts = path.split(".");
    const propertyName = parts[parts.length - 1];
    
    try {
      Object.defineProperty(current, propertyName, {
        get: () => {
          return targetValue;
        },
        set: (value) => {
          envConfig[path] = value;
        },
        enumerable: true,
        configurable: true,
      });
      // 移除已处理的待处理项
      pendingOverrides.delete(path);
    } catch (error) {
      console.warn(`Failed to override property ${path}:`, error);
    }
  }
}

function overrideConfig(config) {
  Object.keys(config).forEach((key) => {
    const current = getObjectFromPath(key);
    
    if (current) {
      // 对象已存在，直接应用劫持
      checkAndApplyPendingOverride(key, config[key]);
    } else {
      // 对象不存在，设置监听
      observePathForOverride(key, config[key]);
    }
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
