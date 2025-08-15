const envConfig = {};

// 从插件缓存获取配置的对象路径 例如：['window.service_cf3_config', 'window.env', 'window.platformConfig.env']
function getSettingObjects() {
  // 由于chrome.storage是异步的，我们需要返回一个Promise
  return new Promise((resolve) => {
    try {
      // 从插件的同步存储中获取配置
      chrome.storage.sync.get(['devhelper_env_objects'], function(result) {
        if (result.devhelper_env_objects) {
          resolve(result.devhelper_env_objects);
        } else {
          // 如果没有保存的配置，返回默认路径
          resolve(['window.service_cf3_config']);
        }
      });
    } catch (e) {
      console.error('Failed to get setting objects from chrome storage:', e);
      // 出错时返回默认配置
      resolve(['window.service_cf3_config']);
    }
  });
}

// 根据配置的对象路径获取配置
async function getConfigsForObjects() {
  try {
    const objects = await getSettingObjects();
    const config = {};
    
    objects.forEach(path => {
      try {
        // 解析对象路径，例如 "window.service_cf3_config"
        const parts = path.split('.');
        let current = window;
        
        for (let i = 1; i < parts.length; i++) {
          if (current[parts[i]] === undefined) {
            current = null;
            break;
          }
          current = current[parts[i]];
        }
        
        if (current) {
          // 将获取到的配置合并到config对象
          Object.assign(config, current);
        }
      } catch (e) {
        console.error(`Failed to get config for path ${path}:`, e);
      }
    });
    
    return config;
  } catch (e) {
    console.error('Failed to get configs for objects:', e);
    return {};
  }
}

// 初始化环境配置
async function initEnvConfig() {
  try {
    // 获取并应用配置
    const config = await getConfigsForObjects();
    Object.assign(envConfig, config);
    
    // 向content.js请求配置
    window.postMessage({
      action: "getEnvConfig"
    }, "*");
  } catch (e) {
    console.error('Failed to initialize environment config:', e);
  }
}

window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  
  // 接收来自content.js的配置
  if (event.data.action === "getEnvConfig") {
    // 向content.js发送配置
    window.postMessage({
      action: "returnEnvConfig",
      config: envConfig
    }, "*");

  }
});

// 页面加载完成后初始化环境配置
async function initializeEnvironment() {
  try {
    await initEnvConfig();
  } catch (e) {
    console.error('Failed to initialize environment:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEnvironment);
} else {
  initializeEnvironment();
}
