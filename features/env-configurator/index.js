// index.js - 环境配置修改器前端逻辑

// 配置存储键
const STORAGE_KEY = "envConfiguratorConfig";
const CUSTOM_CONFIGS_KEY = "envConfiguratorCustomConfigs";

// DOM元素
let configVariablesContainer;
let configNameSelect;
let importConfigBtn;
let exportConfigBtn;
let refreshConfigBtn;
let applyConfigBtn;

// 当前配置数据
let currentConfig = {};
let customConfigs = {};
let currentConfigName = "default";

// DOM加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  // 获取DOM元素
  configVariablesContainer = document.getElementById("configVariables");
  configNameSelect = document.getElementById("configName");
  importConfigBtn = document.getElementById("importConfig");
  exportConfigBtn = document.getElementById("exportConfig");
  refreshConfigBtn = document.getElementById("refreshConfig");
  applyConfigBtn = document.getElementById("applyConfig");

  // 初始化事件监听
  initEventListeners();

  // 加载配置
  loadConfig();

  // 从网页获取配置变量
  fetchConfigVariables();

  // 初始化设置按钮
  initSettingButton();
});

// 初始化事件监听
function initEventListeners() {
  // 导入配置
  importConfigBtn.addEventListener("click", importConfig);

  // 导出配置
  exportConfigBtn.addEventListener("click", exportConfig);

  // 刷新配置
  refreshConfigBtn.addEventListener("click", fetchConfigVariables);

  // 应用配置
  applyConfigBtn.addEventListener("click", applyConfig);

  // 配置选择器变更
  configNameSelect.addEventListener("change", (e) => {
    currentConfigName = e.target.value;
    loadSelectedConfig();
  });
}

// 加载配置
function loadConfig() {
  // 加载自定义配置
  chrome.storage.local.get([CUSTOM_CONFIGS_KEY], (result) => {
    customConfigs = result[CUSTOM_CONFIGS_KEY] || {};
    updateConfigSelector();

    // 加载选中的配置
    loadSelectedConfig();
  });
}

// 更新配置选择器
function updateConfigSelector() {
  // 清空现有选项
  configNameSelect.innerHTML = "";

  // 添加默认配置
  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "默认配置";
  configNameSelect.appendChild(defaultOption);

  // 添加自定义配置
  Object.keys(customConfigs).forEach((configName) => {
    const option = document.createElement("option");
    option.value = configName;
    option.textContent = configName;
    configNameSelect.appendChild(option);
  });

  // 选中当前配置
  configNameSelect.value = currentConfigName;
}

// 加载选中的配置
function loadSelectedConfig() {
  if (currentConfigName === "default") {
    // 默认配置从网页获取
    fetchConfigVariables();
  } else {
    // 自定义配置从存储加载
    currentConfig = customConfigs[currentConfigName] || {};
    renderConfigVariables();
  }
}

// 从网页获取配置变量
function fetchConfigVariables() {
  // 向content.js发送消息，请求配置变量
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getConfigVariables" },
        (response) => {
          if (response && response.configVariables) {
            currentConfig = response.configVariables;
            renderConfigVariables();
          } else {
            showEmptyState();
          }
        }
      );
    }
  });
}

// 显示空状态
function showEmptyState() {
  configVariablesContainer.innerHTML = `
        <div class="empty-state">
            <p>未检测到配置变量</p>
            <button id="refreshBtn" class="btn">刷新</button>
        </div>
    `;

  // 绑定刷新按钮事件
  document
    .getElementById("refreshBtn")
    .addEventListener("click", fetchConfigVariables);
}

// 更新配置值
function updateConfigValue(key, inputElement) {
  let newValue;
  if (inputElement.tagName === "TEXTAREA") {
    try {
      newValue = JSON.parse(inputElement.value);
    } catch (e) {
      alert("无效的JSON格式: " + e.message);
      return;
    }
  } else {
    // 尝试转换为适当的类型
    const valueStr = inputElement.value;
    if (valueStr === "true") newValue = true;
    else if (valueStr === "false") newValue = false;
    else if (valueStr === "null") newValue = null;
    else if (!isNaN(valueStr)) newValue = Number(valueStr);
    else newValue = valueStr;
  }

  currentConfig[key] = newValue;
}

// 添加配置分组功能
function groupConfigVariables(config) {
  const grouped = {
    general: {},
    api: {},
    features: {},
    other: {},
  };

  Object.keys(config).forEach((key) => {
    if (
      key.toLowerCase().includes("api") ||
      key.toLowerCase().includes("url")
    ) {
      grouped.api[key] = config[key];
    } else if (
      key.toLowerCase().includes("feature") ||
      key.toLowerCase().includes("flag")
    ) {
      grouped.features[key] = config[key];
    } else if (
      ["env", "debug", "version", "mode"].includes(key.toLowerCase())
    ) {
      grouped.general[key] = config[key];
    } else {
      grouped.other[key] = config[key];
    }
  });

  return grouped;
}

// 渲染配置变量
function renderConfigVariables() {
  // 清空容器
  configVariablesContainer.innerHTML = "";

  if (Object.keys(currentConfig).length === 0) {
    showEmptyState();
    return;
  }

  // 分组配置变量
  const groupedConfig = groupConfigVariables(currentConfig);

  // 渲染每个组
  Object.keys(groupedConfig).forEach((groupName) => {
    const group = groupedConfig[groupName];
    if (Object.keys(group).length === 0) return;

    // 创建组标题
    const groupTitle = document.createElement("h3");
    groupTitle.className = "group-title";
    groupTitle.textContent = {
      general: "基本配置",
      api: "API配置",
      features: "功能开关",
      other: "其他配置",
    }[groupName];
    configVariablesContainer.appendChild(groupTitle);

    // 渲染组内每个配置变量
    Object.keys(group).forEach((key) => {
      const value = group[key];
      const configItem = document.createElement("div");
      configItem.className = "config-item";

      // 标签
      const label = document.createElement("label");
      label.textContent = key;
      label.htmlFor = `config_${key}`;

      // 输入框或文本域
      let input;
      if (typeof value === "object" && value !== null) {
        // 对象或数组使用文本域
        input = document.createElement("textarea");
        input.id = `config_${key}`;
        input.value = JSON.stringify(value, null, 2);
      } else {
        // 基本类型使用输入框
        input = document.createElement("input");
        input.type = "text";
        input.id = `config_${key}`;
        input.value = typeof value === "string" ? value : String(value);
      }

      // 为所有输入元素添加变化监听 (使用防抖)
      let timeout;
      input.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          updateConfigValue(key, input);
        }, 300);
      });

      // 添加到配置项
      configItem.appendChild(label);
      configItem.appendChild(input);
      configVariablesContainer.appendChild(configItem);
    });
  });

  // 添加"恢复默认配置"按钮
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn reset-btn";
  resetBtn.textContent = "恢复默认配置";
  resetBtn.addEventListener("click", () => {
    if (confirm("确定要恢复默认配置吗？")) {
      currentConfigName = "default";
      loadConfig();
    }
  });
  configVariablesContainer.appendChild(resetBtn);
}

// 导入配置
function importConfig() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadstart = () => {
        // 显示加载提示
        alert("正在导入配置，请稍候...");
      };
      reader.onload = (event) => {
        try {
          const importedConfig = JSON.parse(event.target.result);
          const configName = prompt("请输入配置名称:", "importedConfig");
          if (configName) {
            customConfigs[configName] = importedConfig;
            saveCustomConfigs();
            currentConfigName = configName;
            loadConfig();
            alert("配置导入成功");
          }
        } catch (e) {
          alert("导入失败: 无效的JSON文件 - " + e.message);
        }
      };
      reader.onerror = () => {
        alert("导入失败: 文件读取错误");
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// 导出配置
function exportConfig() {
  try {
    const configStr = JSON.stringify(currentConfig, null, 2);
    const blob = new Blob([configStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentConfigName || "env-config"}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("导出失败: " + e.message);
  }
}

// 应用配置
function applyConfig() {
  // 保存当前配置
  if (currentConfigName !== "default") {
    customConfigs[currentConfigName] = currentConfig;
    saveCustomConfigs();
  }

  // 向content.js发送消息，应用配置
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "applyConfig",
          config: currentConfig,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            alert("配置应用失败: 无法连接到页面");
            return;
          }
          if (response && response.success) {
            alert("配置已成功应用");
          } else {
            alert("配置应用失败: " + (response ? response.error : "未知错误"));
          }
        }
      );
    } else {
      alert("配置应用失败: 没有活动标签页");
    }
  });
}

// 保存自定义配置
function saveCustomConfigs() {
  chrome.storage.local.set({ [CUSTOM_CONFIGS_KEY]: customConfigs }, () => {
    console.log("配置已保存");
    updateConfigSelector();
  });
}

// 添加新配置
function addNewConfig() {
  const configName = prompt("请输入新配置名称:", "newConfig");
  if (configName && configName.trim() !== "") {
    // 以当前配置为基础创建新配置
    customConfigs[configName] = JSON.parse(JSON.stringify(currentConfig));
    saveCustomConfigs();
    currentConfigName = configName;
    loadConfig();
  }
}

// 初始化添加新配置按钮
function initAddConfigButton() {
  const addConfigBtn = document.createElement("button");
  addConfigBtn.className = "btn add-config-btn";
  addConfigBtn.textContent = "添加新配置";
  addConfigBtn.addEventListener("click", addNewConfig);

  // 将按钮添加到配置选择器旁边
  const configSelectorContainer = configNameSelect.parentElement;
  configSelectorContainer.appendChild(addConfigBtn);
}

function initSettingButton() {
  document.getElementById("settingsBtn").addEventListener("click", function () {
    window.open("config.html", "_blank");
  });
}

// 在DOM加载完成后初始化额外UI
document.addEventListener("DOMContentLoaded", initAddConfigButton);
