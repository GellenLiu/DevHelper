// 加载保存的配置
function loadConfig() {
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

    // 更新UI
    document.getElementById("enabled").checked = config.enabled;
    document.getElementById("monitorWindowError").checked = config.errorTypes.windowError;
    document.getElementById("monitorErrorEvent").checked = config.errorTypes.errorEvent;
    document.getElementById("monitorUnhandledRejection").checked = config.errorTypes.unhandledRejection;
    document.getElementById("monitorConsoleError").checked = config.errorTypes.consoleError;
    // 设置新添加的错误类型复选框状态
    document.getElementById("monitorSyntaxError").checked = config.errorTypes.syntaxError !== undefined ? config.errorTypes.syntaxError : true;
    document.getElementById("monitorReferenceError").checked = config.errorTypes.referenceError !== undefined ? config.errorTypes.referenceError : true;
    document.getElementById("monitorTypeError").checked = config.errorTypes.typeError !== undefined ? config.errorTypes.typeError : true;
    document.getElementById("monitorRangeError").checked = config.errorTypes.rangeError !== undefined ? config.errorTypes.rangeError : true;
    document.getElementById("monitorURIError").checked = config.errorTypes.uriError !== undefined ? config.errorTypes.uriError : true;
    document.getElementById("monitorEvalError").checked = config.errorTypes.evalError !== undefined ? config.errorTypes.evalError : true;
    // 渲染错误消息过滤器列表
    renderErrorMessageFilters(config.errorMessageFilters || []);

    // 渲染域名列表
    renderDomainList(config.monitoredDomains);
  });
}

// 渲染错误消息过滤器列表
function renderErrorMessageFilters(filters) {
  const filterList = document.getElementById("errorMessageFilterList");
  filterList.innerHTML = "";

  if (!filters || filters.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "filter-item";
    emptyItem.textContent = "No filters added yet";
    filterList.appendChild(emptyItem);
    return;
  }

  filters.forEach((filter, index) => {
    const filterItem = document.createElement("div");
    filterItem.className = "filter-item";
    filterItem.style.display = "flex";
    filterItem.style.justifyContent = "space-between";
    filterItem.style.alignItems = "center";
    filterItem.style.padding = "8px";
    filterItem.style.marginBottom = "5px";
    filterItem.style.backgroundColor = "#f5f5f5";
    filterItem.style.borderRadius = "4px";

    // 过滤器文本
    const filterText = document.createElement("span");
    filterText.textContent = filter;
    filterText.style.overflow = "hidden";
    filterText.style.textOverflow = "ellipsis";
    filterText.style.marginRight = "10px";

    // 删除按钮
    const removeButton = document.createElement("button");
    removeButton.textContent = "×";
    removeButton.style.backgroundColor = "transparent";
    removeButton.style.border = "none";
    removeButton.style.color = "#ff4d4f";
    removeButton.style.cursor = "pointer";
    removeButton.style.fontSize = "16px";
    removeButton.style.padding = "0 5px";
    removeButton.style.borderRadius = "50%";
    removeButton.style.transition = "background-color 0.2s";

    removeButton.addEventListener("mouseover", () => {
      removeButton.style.backgroundColor = "rgba(255, 77, 79, 0.1)";
    });

    removeButton.addEventListener("mouseout", () => {
      removeButton.style.backgroundColor = "transparent";
    });

    // 删除过滤器
    removeButton.addEventListener("click", () => {
      removeErrorMessageFilter(index);
    });

    filterItem.appendChild(filterText);
    filterItem.appendChild(removeButton);
    filterList.appendChild(filterItem);
  })
}

// 渲染域名列表
function renderDomainList(domains) {
  const domainList = document.getElementById("domainList");
  domainList.innerHTML = "";

  if (domains.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "domain-item";
    emptyItem.textContent = "No domains added yet";
    domainList.appendChild(emptyItem);
    return;
  }

  domains.forEach((domain, index) => {
    const domainItem = document.createElement("div");
    domainItem.className = "domain-item";
    domainItem.style.display = "flex";
    domainItem.style.justifyContent = "space-between";
    domainItem.style.alignItems = "center";
    domainItem.style.padding = "8px";
    domainItem.style.marginBottom = "5px";
    domainItem.style.backgroundColor = "#f5f5f5";
    domainItem.style.borderRadius = "4px";

    // 域名文本
    const domainText = document.createElement("span");
    domainText.textContent = domain;
    domainText.style.overflow = "hidden";
    domainText.style.textOverflow = "ellipsis";
    domainText.style.marginRight = "10px";

    // 删除按钮
    const removeButton = document.createElement("button");
    removeButton.textContent = "×";
    removeButton.style.backgroundColor = "transparent";
    removeButton.style.border = "none";
    removeButton.style.color = "#ff4d4f";
    removeButton.style.cursor = "pointer";
    removeButton.style.fontSize = "16px";
    removeButton.style.padding = "0 5px";
    removeButton.style.borderRadius = "50%";
    removeButton.style.transition = "background-color 0.2s";

    removeButton.addEventListener("mouseover", () => {
      removeButton.style.backgroundColor = "rgba(255, 77, 79, 0.1)";
    });

    removeButton.addEventListener("mouseout", () => {
      removeButton.style.backgroundColor = "transparent";
    });

    // 删除域名
    removeButton.addEventListener("click", () => {
      removeDomain(index);
    });

    domainItem.appendChild(domainText);
    domainItem.appendChild(removeButton);
    domainList.appendChild(domainItem);
  });
}

// 添加域名
function addDomain() {
  const input = document.getElementById("newDomain");
  const domain = input.value.trim();
  if (!domain) return;

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

    // 确保monitoredDomains始终为数组（处理旧数据格式）
    if (typeof config.monitoredDomains === "string") {
      config.monitoredDomains = config.monitoredDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    } else if (!Array.isArray(config.monitoredDomains)) {
      config.monitoredDomains = [];
    }

    // 避免重复添加
    if (!config.monitoredDomains?.includes(domain)) {
      config.monitoredDomains.push(domain);
      // 立即更新UI
      renderDomainList(config.monitoredDomains);
      input.value = "";
      // 然后保存到storage
      chrome.storage.local.set({ jsErrorMonitorConfig: config }, () => {
        // 通知content script配置已更新
        notifyContentScript(config);
      });
    }
  });
}

// 添加错误消息过滤器
function addErrorMessageFilter() {
  const input = document.getElementById("newErrorMessageFilter");
  const filter = input.value.trim();
  if (!filter) return;

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
      errorMessageFilters: []
    };

    // 确保errorMessageFilters始终为数组
    if (!Array.isArray(config.errorMessageFilters)) {
      config.errorMessageFilters = [];
    }

    // 避免重复添加
    if (!config.errorMessageFilters.includes(filter)) {
      config.errorMessageFilters.push(filter);
      // 立即更新UI
      renderErrorMessageFilters(config.errorMessageFilters);
      input.value = "";
      // 然后保存到storage
      chrome.storage.local.set({ jsErrorMonitorConfig: config }, () => {
        // 通知content script配置已更新
        notifyContentScript(config);
      });
    }
  });
}

// 删除错误消息过滤器
function removeErrorMessageFilter(index) {
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
      errorMessageFilters: []
    };

    if (Array.isArray(config.errorMessageFilters)) {
      config.errorMessageFilters.splice(index, 1);
      chrome.storage.local.set({ jsErrorMonitorConfig: config }, () => {
        renderErrorMessageFilters(config.errorMessageFilters);
        // 通知content script配置已更新
        notifyContentScript(config);
      });
    }
  });
}

// 删除域名
function removeDomain(index) {
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

    config.monitoredDomains.splice(index, 1);
    chrome.storage.local.set({ jsErrorMonitorConfig: config }, () => {
      renderDomainList(config.monitoredDomains);

      // 通知content script配置已更新
      notifyContentScript(config);
    });
  });
}

// 保存配置
function saveConfig() {
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

    config.enabled = document.getElementById("enabled").checked;
    config.errorTypes = {
         windowError: document.getElementById("monitorWindowError").checked,
         errorEvent: document.getElementById("monitorErrorEvent").checked,
         unhandledRejection: document.getElementById("monitorUnhandledRejection").checked,
         consoleError: document.getElementById("monitorConsoleError").checked,
         syntaxError: document.getElementById("monitorSyntaxError").checked,
         referenceError: document.getElementById("monitorReferenceError").checked,
         typeError: document.getElementById("monitorTypeError").checked,
         rangeError: document.getElementById("monitorRangeError").checked,
         uriError: document.getElementById("monitorURIError").checked,
         evalError: document.getElementById("monitorEvalError").checked
     };
     // 处理错误消息过滤器
     // 从过滤器列表收集所有过滤器
     const filterItems = document.querySelectorAll('#errorMessageFilterList .filter-item:not([style*="display: none"])');
     config.errorMessageFilters = Array.from(filterItems)
         ?.map(item => item?.querySelector('span')?.textContent?.trim()) || [];


     chrome.storage.local.set({ jsErrorMonitorConfig: config }, () => {
      // 显示保存成功提示
      const saveButton = document.getElementById("saveConfig");
      const originalText = saveButton.textContent;
      saveButton.textContent = "Saved!";
      saveButton.style.backgroundColor = "#00b42a";

      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.backgroundColor = "#0078d7";
      }, 1500);

      // 通知content script配置已更新
      notifyContentScript(config);
    });
  });
}

// 通知content script配置已更新
function notifyContentScript(config) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "JS_ERROR_MONITOR_CONFIG_UPDATED",
        config: config,
      });
    }
  });
}

// 直接执行初始化代码，因为脚本在body末尾加载，DOM已就绪
loadConfig();
// 添加按钮事件绑定
document.getElementById("addDomain").addEventListener("click", addDomain);
document.getElementById("addErrorMessageFilter").addEventListener("click", addErrorMessageFilter);
document.getElementById("saveConfig").addEventListener("click", saveConfig);
// 回车键添加域名
document.getElementById("newDomain").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addDomain();
  });
// 回车键添加过滤器
document.getElementById("newErrorMessageFilter").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addErrorMessageFilter();
  });
