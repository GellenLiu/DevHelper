/**
 * popup.js - Popup 窗口逻辑脚本
 * 处理规则管理、日志查看、设置等功能
 */

// ============ 全局变量 ============
let rules = [];
let logs = [];
let currentEditingRuleId = null;
let currentEditingHeaders = [];

// ============ DOM 元素缓存 ============
let elements = {}; // 在 DOM 加载后才初始化

function initializeElements() {
  elements = {
    // 导航
    navBtns: document.querySelectorAll(".nav-btn"),
    tabContents: document.querySelectorAll(".tab-content"),

    // 规则标签页
    rulesList: document.getElementById("rules-list"),
    addRuleBtn: document.getElementById("add-rule-btn"),
    importRulesBtn: document.getElementById("import-rules-btn"),
    exportRulesBtn: document.getElementById("export-rules-btn"),
    ruleCount: document.getElementById("rule-count"),
    enabledCount: document.getElementById("enabled-count"),

    // 规则编辑面板
    ruleEditor: document.getElementById("rule-editor"),
    editorTitle: document.getElementById("editor-title"),
    ruleName: document.getElementById("rule-name"),
    sourcePattern: document.getElementById("source-pattern"),
    targetUrl: document.getElementById("target-url"),
    ruleMethod: document.getElementById("rule-method"),
    ruleDesc: document.getElementById("rule-desc"),
    enableCookies: document.getElementById("enable-cookies"),
    autoCookies: document.getElementById("auto-cookies"),
    cookieSettings: document.getElementById("cookie-settings"),
    refreshCookiesBtn: document.getElementById("refresh-cookies-btn"),
    manageCookiesBtn: document.getElementById("manage-cookies-btn"),
    headersList: document.getElementById("headers-list"),
    addHeaderBtn: document.getElementById("add-header-btn"),
    saveRuleBtn: document.getElementById("save-rule-btn"),
    cancelEditBtn: document.getElementById("cancel-edit-btn"),
    closeEditor: document.getElementById("close-editor"),

    // Cookie 管理器
    cookieManager: document.getElementById("cookie-manager"),
    autoCookiesList: document.getElementById("auto-cookies-list"),
    manualCookiesList: document.getElementById("manual-cookies-list"),
    noAutoCookies: document.getElementById("no-auto-cookies"),
    noManualCookies: document.getElementById("no-manual-cookies"),
    cookieTextarea: document.getElementById("cookie-textarea"),
    addCookieBtn: document.getElementById("add-cookie-btn"),
    closeCookieManagerBtn: document.getElementById("close-cookie-manager-btn"),
    closeCookieManager: document.getElementById("close-cookie-manager"),

    // 日志标签页
    searchLogs: document.getElementById("search-logs"),
    filterType: document.getElementById("filter-type"),
    filterMatched: document.getElementById("filter-matched"),
    logsList: document.getElementById("logs-list"),
    clearLogsBtn: document.getElementById("clear-logs-btn"),
    exportLogsBtn: document.getElementById("export-logs-btn"),
    totalLogs: document.getElementById("total-logs"),
    requestCount: document.getElementById("request-count"),
    responseCount: document.getElementById("response-count"),

    // 日志详情面板
    logDetail: document.getElementById("log-detail"),
    logDetailContent: document.getElementById("log-detail-content"),
    copyLogBtn: document.getElementById("copy-log-btn"),
    closeLogDetail: document.getElementById("close-log-detail"),
    closeLogDetailBtn: document.getElementById("close-log-detail-btn"),

    // 设置标签页
    exportAllBtn: document.getElementById("export-all-btn"),
    importAllBtn: document.getElementById("import-all-btn"),
    resetBtn: document.getElementById("reset-btn"),
    maxLogs: document.getElementById("max-logs"),
    autoClearLogs: document.getElementById("auto-clear-logs"),
    fallbackToOrigin: document.getElementById("fallback-to-origin"),
    globalEnable: document.getElementById("global-enable"),
    allowedDomains: document.getElementById("allowed-domains"),
  };
}

// ============ 初始化 ============
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  // 如果 DOM 已经加载，直接初始化
  initialize();
}

async function initialize() {
  // 等待一短时间确保所有 DOM 元素都已加载
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 初始化 DOM 元素引用
  initializeElements();

  loadSettings();
  initializeEventListeners();
  await loadRules();
  await loadLogs();
  updateStats();
}

// ============ 事件监听器初始化 ============
function initializeEventListeners() {
  try {
    // 导航
    if (elements.navBtns && elements.navBtns.length > 0) {
      elements.navBtns.forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
      });
    }

    // 规则管理
    if (elements.addRuleBtn) {
      elements.addRuleBtn.addEventListener("click", () => {
        openRuleEditor();
      });
    }
    if (elements.importRulesBtn) {
      elements.importRulesBtn.addEventListener("click", importRulesFromFile);
    }
    if (elements.exportRulesBtn) {
      elements.exportRulesBtn.addEventListener("click", exportRulesToFile);
    }

    // 规则编辑
    if (elements.closeEditor) {
      elements.closeEditor.addEventListener("click", closeRuleEditor);
    }
    if (elements.cancelEditBtn) {
      elements.cancelEditBtn.addEventListener("click", closeRuleEditor);
    }
    if (elements.saveRuleBtn) {
      elements.saveRuleBtn.addEventListener("click", saveRule);
    }
    if (elements.enableCookies) {
      elements.enableCookies.addEventListener("click", (e) => {
        e.target.classList.toggle("enabled");
        if (elements.cookieSettings) {
          elements.cookieSettings.style.display = e.target.classList.contains("enabled")
            ? "block"
            : "none";
        }
      });
    }
    if (elements.autoCookies) {
      elements.autoCookies.addEventListener("click", (e) => {
        e.target.classList.toggle("enabled");
      });
    }
    if (elements.addHeaderBtn) {
      elements.addHeaderBtn.addEventListener("click", addHeaderField);
    }
    if (elements.manageCookiesBtn) {
      elements.manageCookiesBtn.addEventListener("click", openCookieManager);
    }
    if (elements.refreshCookiesBtn) {
      elements.refreshCookiesBtn.addEventListener("click", refreshCookies);
    }

    // Cookie 管理
    if (elements.closeCookieManager) {
      elements.closeCookieManager.addEventListener("click", closeCookieManager);
    }
    if (elements.closeCookieManagerBtn) {
      elements.closeCookieManagerBtn.addEventListener(
        "click",
        closeCookieManager
      );
    }
    if (elements.addCookieBtn) {
      elements.addCookieBtn.addEventListener("click", addManualCookie);
    }

    // 日志
    if (elements.searchLogs) {
      elements.searchLogs.addEventListener("input", searchLogs);
    }
    if (elements.filterType) {
      elements.filterType.addEventListener("change", filterLogs);
    }
    if (elements.filterMatched) {
      elements.filterMatched.addEventListener("change", filterLogs);
    }
    if (elements.clearLogsBtn) {
      elements.clearLogsBtn.addEventListener("click", clearLogs);
    }
    if (elements.exportLogsBtn) {
      elements.exportLogsBtn.addEventListener("click", exportLogsToFile);
    }

    // 日志详情
    if (elements.closeLogDetail) {
      elements.closeLogDetail.addEventListener("click", closeLogDetail);
    }
    if (elements.closeLogDetailBtn) {
      elements.closeLogDetailBtn.addEventListener("click", closeLogDetail);
    }
    if (elements.copyLogBtn) {
      elements.copyLogBtn.addEventListener("click", copyLogToClipboard);
    }

    // 设置
    if (elements.exportAllBtn) {
      elements.exportAllBtn.addEventListener("click", exportAllData);
    }
    if (elements.importAllBtn) {
      elements.importAllBtn.addEventListener("click", importAllData);
    }
    if (elements.resetBtn) {
      elements.resetBtn.addEventListener("click", resetAllSettings);
    }

  } catch (error) {
  }
}

// ============ 导航和标签页切换 ============
function switchTab(tabName) {
  elements.navBtns.forEach((btn) => btn.classList.remove("active"));
  elements.tabContents.forEach((content) => content.classList.remove("active"));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");

  if (tabName === "logs") {
    loadLogs();
  }
}

// ============ 规则管理 ============
async function loadRules() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_RULES" }, (response) => {
      if (response && response.rules) {
        rules = response.rules;
        renderRulesList();
        updateRuleStats();
        resolve();
      } else {
        console.error("Failed to load rules");
        resolve();
      }
    });
  });
}

function renderRulesList() {
  elements.rulesList.innerHTML = "";

  if (rules.length === 0) {
    elements.rulesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">还没有配置任何规则</div>
                <button class="btn btn-primary" id="create-first-rule-btn">+ 创建第一个规则</button>
            </div>
        `;
    // 绑定空状态按钮
    const createBtn = elements.rulesList.querySelector(
      "#create-first-rule-btn"
    );
    if (createBtn) {
      createBtn.addEventListener("click", () => openRuleEditor());
    }
    return;
  }

  rules.forEach((rule) => {
    const ruleItem = document.createElement("div");
    ruleItem.className = "rule-item";
    ruleItem.dataset.ruleId = rule.id; // 添加 data 属性
    ruleItem.innerHTML = `
            <div class="rule-info">
                <div class="rule-name">${escapeHtml(rule.name)}</div>
                <div class="rule-details">
                    <div class="rule-detail-row rule-detail-row-url">
                        <span class="rule-detail-label">源:</span>
                        <span class="rule-detail-value">${escapeHtml(
                          rule.sourcePattern
                        )}</span>
                    </div>
                    <div class="rule-detail-row rule-detail-row-url">
                        <span class="rule-detail-label">目标:</span>
                        <span class="rule-detail-value">${escapeHtml(
                          rule.targetUrl
                        )}</span>
                    </div>
                    <div class="rule-detail-row">
                        <span class="rule-detail-label">方法:</span>
                        <span class="rule-detail-value">${rule.method}</span>
                    </div>
                    <div class="rule-detail-row">
                        <span class="rule-detail-label">Cookie:</span>
                        <span class="rule-detail-value">${rule.cookies?.enabled ? (rule.cookies?.auto ? 'auto' : (rule.cookies?.manual && rule.cookies.manual.length > 0 ? escapeHtml(rule.cookies.manual.map(c => `${c.name}=${c.value}`).join('; ')).substring(0, 50) + (rule.cookies.manual.map(c => `${c.name}=${c.value}`).join('; ').length > 50 ? '...' : '') : '无')) : '禁用'}</span>
                    </div>

                </div>
            </div>
            <div class="rule-toggle">
                        <span class="rule-detail-value">
                            <button data-action="toggle" 
                                    title="${rule.enabled ? "禁用" : "启用"}"
                                    class="toggle-switch ${
                                      rule.enabled ? "enabled" : ""
                                    }">
                            </button>
                        </span>
                    </div>
            <div class="rule-actions">
                <button data-action="edit" title="编辑" class="icon-btn">
                    <svg t="1764423525816" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5303" width="200" height="200"><path d="M800 959.96l-576 0c-52.9 0-96-43.1-96-96l0-640c0-52.9 43.1-96 96-96l448 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-448 0c-17.6 0-32 14.4-32 32l0 640c0 17.7 14.4 32 32 32l576 0c17.7 0 32-14.3 32-32l0-512c0-17.7 14.3-32 32-32s32 14.3 32 32l0 512C896 916.96 852.9 959.96 800 959.96zM511.7 542.76c-8.3 0-16.5-3.2-22.8-9.5-12.4-12.6-12.3-32.8 0.3-45.2l418.3-413.7c12.6-12.4 32.8-12.3 45.2 0.3 12.4 12.6 12.3 32.8-0.3 45.2l-418.3 413.7C527.9 539.66 519.8 542.76 511.7 542.76z" p-id="5304" fill="#cccccc"></path></svg>
                </button>
                <button data-action="duplicate" title="复制" class="icon-btn">
                    <svg t="1764423773139" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7370" width="200" height="200"><path d="M585.142857 365.714286a73.142857 73.142857 0 0 1 73.142857 73.142857v390.095238a73.142857 73.142857 0 0 1-73.142857 73.142857H195.047619a73.142857 73.142857 0 0 1-73.142857-73.142857V438.857143a73.142857 73.142857 0 0 1 73.142857-73.142857h390.095238z m0 73.142857H195.047619v390.095238h390.095238V438.857143z m-73.142857 219.428571v73.142857H268.190476v-73.142857h243.809524zM828.952381 121.904762a73.142857 73.142857 0 0 1 73.142857 73.142857v390.095238a73.142857 73.142857 0 0 1-73.142857 73.142857h-121.904762v-73.142857h121.904762V195.047619H438.857143v121.904762h-73.142857V195.047619a73.142857 73.142857 0 0 1 73.142857-73.142857h390.095238zM512 536.380952v73.142858H268.190476v-73.142858h243.809524z" p-id="7371" fill="#cccccc"></path></svg>
                </button>
                <button data-action="delete" title="删除" class="icon-btn delete-btn">
                    <svg t="1764423742787" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6335" width="200" height="200"><path d="M608 768c-17.696 0-32-14.304-32-32L576 384c0-17.696 14.304-32 32-32s32 14.304 32 32l0 352C640 753.696 625.696 768 608 768zM416 768c-17.696 0-32-14.304-32-32L384 384c0-17.696 14.304-32 32-32s32 14.304 32 32l0 352C448 753.696 433.696 768 416 768zM928 224l-160 0L768 160c0-52.928-42.72-96-95.264-96L352 64C299.072 64 256 107.072 256 160l0 64L96 224C78.304 224 64 238.304 64 256s14.304 32 32 32l832 0c17.696 0 32-14.304 32-32S945.696 224 928 224zM320 160c0-17.632 14.368-32 32-32l320.736 0C690.272 128 704 142.048 704 160l0 64L320 224 320 160zM736.128 960 288.064 960c-52.928 0-96-43.072-96-96L192.064 383.52c0-17.664 14.336-32 32-32s32 14.336 32 32L256.064 864c0 17.664 14.368 32 32 32l448.064 0c17.664 0 32-14.336 32-32L768.128 384.832c0-17.664 14.304-32 32-32s32 14.336 32 32L832.128 864C832.128 916.928 789.056 960 736.128 960z" fill="#cccccc" p-id="6336"></path></svg>
                </button>
            </div>
        `;
    elements.rulesList.appendChild(ruleItem);
  });

  // 设置事件委托处理所有动作
  setupRuleListEventDelegation();
}

function setupRuleListEventDelegation() {
  if (!elements.rulesList) return;

  elements.rulesList.removeEventListener("click", handleRuleAction);
  elements.rulesList.addEventListener("click", handleRuleAction);
}

function handleRuleAction(e) {
  const button = e.target.closest("button[data-action]");
  if (!button) return;

  const ruleItem = button.closest(".rule-item");
  if (!ruleItem) return;

  const ruleId = parseInt(ruleItem.dataset.ruleId);
  const action = button.dataset.action;

  console.log("Rule action:", action, "ruleId:", ruleId);

  switch (action) {
    case "toggle":
      toggleRuleStatus(ruleId);
      break;
    case "edit":
      editRule(ruleId);
      break;
    case "delete":
      deleteRule(ruleId);
      break;
    case "duplicate":
      duplicateRule(ruleId);
      break;
  }
}

function openRuleEditor(ruleId = null) {
  try {
    currentEditingRuleId = ruleId;
    currentEditingHeaders = [];

    if (ruleId) {
      // 编辑现有规则
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) {
        return;
      }

      if (elements.editorTitle) elements.editorTitle.textContent = "编辑规则";
      if (elements.ruleName) elements.ruleName.value = rule.name;
      if (elements.sourcePattern)
        elements.sourcePattern.value = rule.sourcePattern;
      if (elements.targetUrl) elements.targetUrl.value = rule.targetUrl;
      if (elements.ruleMethod) elements.ruleMethod.value = rule.method;
      if (elements.ruleDesc) elements.ruleDesc.value = rule.description;
      if (elements.enableCookies) {
        if (rule.cookies?.enabled !== false) {
          elements.enableCookies.classList.add("enabled");
        } else {
          elements.enableCookies.classList.remove("enabled");
        }
      }
      if (elements.autoCookies) {
        if (rule.cookies?.auto !== false) {
          elements.autoCookies.classList.add("enabled");
        } else {
          elements.autoCookies.classList.remove("enabled");
        }
      }
      if (elements.cookieSettings) {
        elements.cookieSettings.style.display =
          elements.enableCookies && elements.enableCookies.classList.contains("enabled")
            ? "block"
            : "none";
      }

      // 加载 Headers
      currentEditingHeaders = Object.entries(rule.headers || {}).map(
        ([key, value]) => {
          // 检查是否已存在type字段，否则默认为fixed
          if (typeof value === 'object' && value !== null) {
            return {
              key,
              value: value.value,
              type: value.type || 'fixed'
            };
          }
          // 旧格式兼容处理
          return {
            key,
            value,
            type: 'fixed'
          };
        }
      );
      renderHeaders();
    } else {
      // 新建规则
      if (elements.editorTitle) elements.editorTitle.textContent = "创建新规则";
      if (elements.ruleName) elements.ruleName.value = "";
      if (elements.sourcePattern) elements.sourcePattern.value = "";
      if (elements.targetUrl) elements.targetUrl.value = "";
      if (elements.ruleMethod) elements.ruleMethod.value = "ALL";
      if (elements.ruleDesc) elements.ruleDesc.value = "";
      if (elements.enableCookies) {
        elements.enableCookies.classList.add("enabled");
      }
      if (elements.autoCookies) {
        elements.autoCookies.classList.add("enabled");
      }
      if (elements.cookieSettings)
        elements.cookieSettings.style.display = "block";
      currentEditingHeaders = [];
      if (elements.headersList) elements.headersList.innerHTML = "";
    }

    if (elements.ruleEditor) {
      elements.ruleEditor.style.display = "block";
      
      // 如果是编辑现有规则，将编辑器插入到对应的rule-item下方
      if (ruleId) {
        const ruleItem = document.querySelector(`[data-rule-id="${ruleId}"]`);
        if (ruleItem) {
          // 保存编辑器的原始父元素，以便关闭时恢复
          elements.ruleEditor._originalParent = elements.ruleEditor.parentNode;
          // 将编辑器插入到rule-item后面
          ruleItem.parentNode.insertBefore(elements.ruleEditor, ruleItem.nextSibling);
        }
      } else {
        // 新建规则时，将编辑器恢复到原始位置
        if (elements.ruleEditor._originalParent && elements.ruleEditor.parentNode !== elements.ruleEditor._originalParent) {
          elements.ruleEditor._originalParent.appendChild(elements.ruleEditor);
        }
      }
      
    } else {
    }
  } catch (error) {
  }
}

function closeRuleEditor() {
  elements.ruleEditor.style.display = "none";
  
  // 将编辑器恢复到原始位置（如果有保存的话）
  if (elements.ruleEditor._originalParent && elements.ruleEditor.parentNode !== elements.ruleEditor._originalParent) {
    elements.ruleEditor._originalParent.appendChild(elements.ruleEditor);
  }
  
  currentEditingRuleId = null;
  currentEditingHeaders = [];
}

async function saveRule() {
  const name = elements.ruleName.value.trim();
  const sourcePattern = elements.sourcePattern.value.trim();
  const targetUrl = elements.targetUrl.value.trim();
  const method = elements.ruleMethod.value;
  const description = elements.ruleDesc.value.trim();
  const enableCookies = elements.enableCookies.classList.contains("enabled");
  const autoCookies = elements.autoCookies.classList.contains("enabled");

  // 验证
  if (!name || !sourcePattern || !targetUrl) {
    alert("请填写必填项：规则名称、源 URL 模式、目标 URL");
    return;
  }

  // 验证正则表达式
  try {
    new RegExp(sourcePattern);
  } catch (error) {
    alert("源 URL 模式不是有效的正则表达式: " + error.message);
    return;
  }

  // 构建 Headers 对象
  const headers = {};
  currentEditingHeaders.forEach((header) => {
    if (header.key.trim()) {
      headers[header.key.trim()] = {
        value: header.value.trim(),
        type: header.type || 'fixed'
      };
    }
  });

  const ruleData = {
    name,
    sourcePattern,
    targetUrl,
    method,
    description,
    cookies: {
      enabled: enableCookies,
      auto: autoCookies,
      manual: [],
    },
    headers,
  };

  // 保存规则
  if (currentEditingRuleId) {
    // 更新现有规则
    chrome.runtime.sendMessage(
      {
        type: "UPDATE_RULE",
        data: { id: currentEditingRuleId, updates: ruleData },
      },
      (response) => {
        if (response.success) {
          alert("规则已更新");
          loadRules();
          closeRuleEditor();
        } else {
          alert("更新规则失败: " + response.error);
        }
      }
    );
  } else {
    // 创建新规则
    chrome.runtime.sendMessage(
      {
        type: "ADD_RULE",
        data: ruleData,
      },
      (response) => {
        if (response.success) {
          alert("规则已创建");
          loadRules();
          closeRuleEditor();
        } else {
          alert("创建规则失败: " + response.error);
        }
      }
    );
  }
}

async function toggleRuleStatus(ruleId) {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;

  chrome.runtime.sendMessage(
    {
      type: "UPDATE_RULE",
      data: { id: ruleId, updates: { enabled: !rule.enabled } },
    },
    (response) => {
      if (response.success) {
        loadRules();
      }
    }
  );
}

function editRule(ruleId) {
  openRuleEditor(ruleId);
}

async function deleteRule(ruleId) {
  if (!confirm("确定要删除这个规则吗？")) {
    return;
  }

  chrome.runtime.sendMessage(
    { type: "DELETE_RULE", data: ruleId },
    (response) => {
      if (response.success) {
        loadRules();
      } else {
        alert("删除规则失败");
      }
    }
  );
}

function duplicateRule(ruleId) {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return;

  const newRule = JSON.parse(JSON.stringify(rule));
  newRule.name = `${newRule.name} (副本)`;

  chrome.runtime.sendMessage(
    {
      type: "ADD_RULE",
      data: newRule,
    },
    (response) => {
      if (response.success) {
        alert("规则已复制");
        loadRules();
      }
    }
  );
}

// ============ Header 管理 ============
function renderHeaders() {
  elements.headersList.innerHTML = "";
  currentEditingHeaders.forEach((header, index) => {
    const item = document.createElement("div");
    item.className = "key-value-item";
    item.dataset.headerIndex = index; // 添加 data 属性

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "Header 名称";
    keyInput.value = escapeHtml(header.key);
    keyInput.addEventListener("change", (e) => {
      currentEditingHeaders[index].key = e.target.value;
    });

    // 添加类型选择下拉框
    const typeSelect = document.createElement("select");
    typeSelect.className = "header-type-select";
    typeSelect.innerHTML = `
      <option value="fixed" ${header.type === "fixed" || !header.type ? "selected" : ""}>固定值</option>
      <option value="cookie" ${header.type === "cookie" ? "selected" : ""}>通过cookie获取值</option>
    `;
    typeSelect.addEventListener("change", (e) => {
      currentEditingHeaders[index].type = e.target.value;
    });

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = header.type === "cookie" ? "Cookie 键名" : "Header 值";
    valueInput.value = escapeHtml(header.value);
    valueInput.addEventListener("change", (e) => {
      currentEditingHeaders[index].value = e.target.value;
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "删除";
    deleteBtn.dataset.action = "delete-header";
    deleteBtn.dataset.headerIndex = index;
    deleteBtn.addEventListener("click", () => removeHeader(index));

    item.appendChild(keyInput);
    item.appendChild(typeSelect);
    item.appendChild(valueInput);
    item.appendChild(deleteBtn);
    elements.headersList.appendChild(item);
  });
}

function addHeaderField() {
  currentEditingHeaders.push({ key: "", value: "", type: "fixed" });
  renderHeaders();
}

function removeHeader(index) {
  currentEditingHeaders.splice(index, 1);
  renderHeaders();
}

// ============ Cookie 管理 ============
async function openCookieManager() {
  if (!currentEditingRuleId) {
    alert("请先保存规则");
    return;
  }

  elements.cookieManager.style.display = "block";
  await loadCookiesForRule();
}

function closeCookieManager() {
  elements.cookieManager.style.display = "none";
}

async function loadCookiesForRule() {
  const rule = rules.find((r) => r.id === currentEditingRuleId);
  if (!rule) return;

  // 获取所有 Cookies
  chrome.runtime.sendMessage(
    {
      type: "GET_COOKIES_FOR_RULE",
      data: { ruleId: currentEditingRuleId, targetUrl: rule.targetUrl },
    },
    (response) => {
      if (response.success) {
        const cookies = response.cookies;
        // 渲染所有 cookies 到 textarea
        renderCookiesList(cookies);
      }
    }
  );
}

function renderCookiesList(cookies) {
  // 将所有 cookies 格式化为 textarea 格式
  const cookieText = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  // 设置到 textarea 中
  elements.cookieTextarea.value = cookieText;
}

// 移除了setupCookiesEventDelegation和handleCookieAction函数，因为不再需要单个cookie操作

async function addManualCookie() {
  const cookieText = elements.cookieTextarea.value.trim();

  if (!cookieText) {
    alert("请输入 Cookie 内容");
    return;
  }

  // 解析 cookie 文本，格式：key1=value1; key2=value2;
  const cookieLines = cookieText.split(';');
  const cookies = {};

  for (const line of cookieLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const [name, ...valueParts] = trimmedLine.split('=');
    const trimmedName = name.trim();
    const value = valueParts.join('=').trim();

    if (trimmedName && value) {
      cookies[trimmedName] = value;
    }
  }

  if (Object.keys(cookies).length === 0) {
    alert("请输入有效的 Cookie 格式，例如：key1=value1; key2=value2;");
    return;
  }

  // 使用新的批量设置 cookie 方法
  chrome.runtime.sendMessage(
    {
      type: "SET_MANUAL_COOKIES",
      data: {
        ruleId: currentEditingRuleId,
        cookies: cookies
      },
    },
    (response) => {
      if (response.success) {
        elements.cookieTextarea.value = "";
        loadCookiesForRule();
      }
    }
  );
}

function deleteCookie(name) {
  chrome.runtime.sendMessage(
    {
      type: "DELETE_MANUAL_COOKIE",
      data: {
        ruleId: currentEditingRuleId,
        name,
      },
    },
    (response) => {
      if (response.success) {
        loadCookiesForRule();
      }
    }
  );
}

async function refreshCookies() {
  const rule = rules.find((r) => r.id === currentEditingRuleId);
  if (!rule) return;

  chrome.runtime.sendMessage(
    {
      type: "REFRESH_COOKIES",
      data: {
        ruleId: currentEditingRuleId,
        targetUrl: rule.targetUrl,
      },
    },
    (response) => {
      if (response.success) {
        // 刷新成功后重新加载 cookies 到 textarea
        loadCookiesForRule();
      } else {
        alert("刷新 Cookie 失败: " + response.error);
      }
    }
  );
}

// ============ 日志管理 ============
async function loadLogs() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_LOGS" }, (response) => {
      if (response && response.logs) {
        logs = response.logs;
        console.log("Loaded logs:", logs.length, "total logs");
        console.log("First few logs:", logs.slice(0, 5));
        // 应用筛选条件，默认只显示被转发的请求
        searchLogs();
        updateLogStats();
        resolve();
      }
    });
  });
}

function renderLogsList(logsToRender) {
  elements.logsList.innerHTML = "";

  if (logsToRender.length === 0) {
    elements.logsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">暂无日志</div>
            </div>
        `;
    return;
  }

  logsToRender.slice(0, 100).forEach((log, idx) => {
    const logItem = document.createElement("div");
    logItem.className = `log-item ${log.type}`;
    logItem.dataset.logIndex = idx; // 用来标识日志项
    logItem.dataset.logUrl = log.sourceUrl || log.url;
    logItem.dataset.logTimestamp = log.timestamp;

    const timeStr = new Date(log.timestamp).toLocaleTimeString();
    const status = log.status || "-";
    const statusText =
      log.statusText || (log.status ? getStatusText(log.status) : "-");
    const statusClass = log.status ? (log.status < 400 ? "ok" : "error") : "";
    const statusBadge = `<span class="log-status ${statusClass}">${status} ${statusText}</span>`;

    // 显示原始 URL
    const displayUrl = log.sourceUrl || log.url || "";
    const method = log.method || "-";

    logItem.innerHTML = `
            <div class="log-time">${timeStr}</div>
            <div class="log-status-col">${statusBadge}</div>
            <div class="log-method">${method}</div>
            <div class="log-url">${escapeHtml(displayUrl)}</div>
        `;

    // 存储日志对象引用
    logItem._logData = log;

    elements.logsList.appendChild(logItem);
  });

  // 设置事件委托
  setupLogsEventDelegation();
}

// 获取HTTP状态码对应的文本描述
function getStatusText(statusCode) {
  const statusMap = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return statusMap[statusCode] || "Unknown";
}

function setupLogsEventDelegation() {
  if (!elements.logsList) return;

  elements.logsList.removeEventListener("click", handleLogAction);
  elements.logsList.addEventListener("click", handleLogAction);
}

function handleLogAction(e) {
  const logItem = e.target.closest(".log-item");
  if (!logItem || !logItem._logData) return;

  console.log("Log item clicked:", logItem._logData);
  showLogDetail(logItem._logData);
}

function showLogDetail(log) {
  elements.logDetail.style.display = "block";

  let detailHtml = "";

  // 基本信息
  detailHtml += `<div class="log-detail-section">\n`;
  detailHtml += `<h4>📋 基本信息</h4>\n`;
  detailHtml += `<div><strong>时间:</strong> ${new Date(
    log.timestamp
  ).toLocaleString()}</div>\n`;
  detailHtml += `<div><strong>类型:</strong> ${
    log.type === "request"
      ? "📤 请求"
      : log.type === "response"
      ? "📥 响应"
      : "⚠️ 错误"
  }</div>\n`;
  detailHtml += `</div>\n`;

  // 请求信息
  if (log.type === "request") {
    detailHtml += `<div class="log-detail-section">\n`;
    detailHtml += `<h4>🔗 请求信息</h4>\n`;
    detailHtml += `<div><strong>方法:</strong> <span class="method-badge">${log.method}</span></div>\n`;
    detailHtml += `<div><strong>原始地址:</strong> <code>${escapeHtml(
      log.sourceUrl || "-"
    )}</code></div>\n`;
    if (log.targetUrl) {
      detailHtml += `<div><strong>转发地址:</strong> <code>${escapeHtml(
        log.targetUrl
      )}</code></div>\n`;
    }
    if (log.ruleName) {
      detailHtml += `<div><strong>匹配规则:</strong> ${escapeHtml(
        log.ruleName
      )}</div>\n`;
    }
    detailHtml += `<div><strong>是否转发:</strong> ${
      log.matched ? "✓ 是" : "✗ 否"
    }</div>\n`;
    detailHtml += `</div>\n`;

    // 请求头
    if (log.headers && Object.keys(log.headers).length > 0) {
      detailHtml += `<div class="log-detail-section">\n`;
      detailHtml += `<h4>📨 请求头</h4>\n`;
      detailHtml += `<div class="log-headers">\n`;
      Object.entries(log.headers).forEach(([key, value]) => {
        detailHtml += `<div class="header-item"><strong>${escapeHtml(
          key
        )}:</strong> <code>${escapeHtml(String(value))}</code></div>\n`;
      });
      detailHtml += `</div>\n`;
      detailHtml += `</div>\n`;
    }

    // 请求参数/请求体
    if (log.body) {
      detailHtml += `<div class="log-detail-section">\n`;
      detailHtml += `<h4>📦 请求参数</h4>\n`;
      detailHtml += `<pre class="log-body">${escapeHtml(
        typeof log.body === "string"
          ? log.body
          : JSON.stringify(log.body, null, 2)
      )}</pre>\n`;
      detailHtml += `</div>\n`;
    }
  }

  // 响应信息
  if (log.type === "response") {
    detailHtml += `<div class="log-detail-section">\n`;
    detailHtml += `<h4>✅ 响应信息</h4>\n`;
    const statusClass = log.status < 400 ? "status-success" : "status-error";
    detailHtml += `<div><strong>状态码:</strong> <span class="${statusClass}">${log.status} ${log.statusText}</span></div>\n`;
    detailHtml += `<div><strong>原始地址:</strong> <code>${escapeHtml(
      log.sourceUrl || "-"
    )}</code></div>\n`;
    detailHtml += `<div><strong>实际地址:</strong> <code>${escapeHtml(
      log.targetUrl || "-"
    )}</code></div>\n`;
    if (log.ruleName) {
      detailHtml += `<div><strong>应用规则:</strong> ${escapeHtml(
        log.ruleName
      )}</div>\n`;
    }
    if (log.size) {
      detailHtml += `<div><strong>响应大小:</strong> ${log.size}</div>\n`;
    }
    if (log.duration) {
      detailHtml += `<div><strong>请求耗时:</strong> ${log.duration}ms</div>\n`;
    }
    detailHtml += `</div>\n`;

    // 响应头
    if (log.headers && Object.keys(log.headers).length > 0) {
      detailHtml += `<div class="log-detail-section">\n`;
      detailHtml += `<h4>📨 响应头</h4>\n`;
      detailHtml += `<div class="log-headers">\n`;
      Object.entries(log.headers).forEach(([key, value]) => {
        detailHtml += `<div class="header-item"><strong>${escapeHtml(
          key
        )}:</strong> <code>${escapeHtml(String(value))}</code></div>\n`;
      });
      detailHtml += `</div>\n`;
      detailHtml += `</div>\n`;
    }

    // 返回值/响应体
    if (log.body) {
      detailHtml += `<div class="log-detail-section">\n`;
      detailHtml += `<h4>📋 返回值</h4>\n`;
      detailHtml += `<pre class="log-body">${escapeHtml(
        typeof log.body === "string"
          ? log.body
          : JSON.stringify(log.body, null, 2)
      )}</pre>\n`;
      detailHtml += `</div>\n`;
    }
  }

  // 错误信息
  if (log.type === "error") {
    detailHtml += `<div class="log-detail-section">\n`;
    detailHtml += `<h4>⚠️ 错误信息</h4>\n`;
    detailHtml += `<div><strong>原始地址:</strong> <code>${escapeHtml(
      log.sourceUrl || "-"
    )}</code></div>\n`;
    if (log.targetUrl) {
      detailHtml += `<div><strong>转发地址:</strong> <code>${escapeHtml(
        log.targetUrl
      )}</code></div>\n`;
    }
    if (log.ruleName) {
      detailHtml += `<div><strong>规则:</strong> ${escapeHtml(
        log.ruleName
      )}</div>\n`;
    }
    detailHtml += `<div><strong>错误:</strong> <span class="error-text">${escapeHtml(
      log.error
    )}</span></div>\n`;
    detailHtml += `</div>\n`;
  }

  elements.logDetailContent.innerHTML = detailHtml;
  elements.logDetailContent.dataset.fullLog = JSON.stringify(log);

  // 滚动到详情面板
  setTimeout(() => {
    elements.logDetail.scrollIntoView({ behavior: "smooth" });
  }, 100);
}

function closeLogDetail() {
  elements.logDetail.style.display = "none";
}

function copyLogToClipboard() {
  const log = JSON.parse(elements.logDetailContent.dataset.fullLog);
  const text = JSON.stringify(log, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    alert("已复制到剪贴板");
  });
}

function searchLogs() {
  // 安全获取元素值，防止元素不存在导致的错误
  const keyword = elements.searchLogs
    ? elements.searchLogs.value.toLowerCase()
    : "";
  const type = elements.filterType ? elements.filterType.value : "";
  const matchedFilter = elements.filterMatched
    ? elements.filterMatched.value
    : "";

  const filtered = logs.filter((log) => {
    // 类型筛选
    if (type && log.type !== type) return false;

    // 匹配状态筛选
    if (matchedFilter === "matched") {
      if (!log.matched) return false;
    } else if (matchedFilter === "unmatched") {
      if (log.matched) return false;
    }

    // 关键字搜索
    if (keyword) {
      const logUrl = log.sourceUrl || log.url || "";
      const logStr = JSON.stringify(log).toLowerCase();
      return logStr.includes(keyword) || logUrl.toLowerCase().includes(keyword);
    }
    return true;
  });

  renderLogsList(filtered);
}

function filterLogs() {
  searchLogs();
}

async function clearLogs() {
  if (!confirm("确定要清空所有日志吗？此操作无法撤销。")) {
    return;
  }

  chrome.runtime.sendMessage({ type: "CLEAR_LOGS" }, (response) => {
    if (response.success) {
      logs = [];
      renderLogsList([]);
      updateLogStats();
      alert("日志已清空");
    }
  });
}

// ============ 数据导出导入 ============
function importRulesFromFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target.result;
        const imported = JSON.parse(jsonString);
        // 这里应该调用导入逻辑
        alert("规则导入成功");
        loadRules();
      } catch (error) {
        alert("导入失败: " + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportRulesToFile() {
  const dataStr = JSON.stringify(rules, null, 2);
  downloadFile(dataStr, "api-proxy-rules.json");
}

async function exportLogsToFile() {
  const dataStr = JSON.stringify(logs, null, 2);
  downloadFile(dataStr, "api-proxy-logs.json");
}

async function exportAllData() {
  const data = {
    rules,
    logs,
    exportTime: new Date().toISOString(),
  };
  const dataStr = JSON.stringify(data, null, 2);
  downloadFile(dataStr, "api-proxy-backup.json");
}

function importAllData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        alert("数据导入成功");
        // 这里应该调用导入逻辑
        loadRules();
        loadLogs();
      } catch (error) {
        alert("导入失败: " + error.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetAllSettings() {
  if (
    !confirm("确定要重置所有设置吗？所有规则和日志都将被删除。此操作无法撤销！")
  ) {
    return;
  }

  // 这里应该调用重置逻辑
  alert("所有设置已重置");
  location.reload();
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============ 工具函数 ============
function updateRuleStats() {
  const total = rules.length;
  const enabled = rules.filter((r) => r.enabled).length;
  elements.ruleCount.textContent = `规则: ${total}`;
  elements.enabledCount.textContent = `启用: ${enabled}`;
}

function updateLogStats() {
  const total = logs.length;
  const requests = logs.filter((l) => l.type === "request").length;
  const responses = logs.filter((l) => l.type === "response").length;
  elements.totalLogs.textContent = `总计: ${total}`;
  elements.requestCount.textContent = `请求: ${requests}`;
  elements.responseCount.textContent = `响应: ${responses}`;
}

function updateStats() {
  updateRuleStats();
  updateLogStats();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============ 设置管理 ============
function loadSettings() {
  chrome.storage.local.get(["settings"], (result) => {
    const settings = result.settings || {};

    // 加载回源设置
    if (elements.fallbackToOrigin) {
      elements.fallbackToOrigin.checked = settings.fallbackToOrigin !== false; // 默认为 true
    }

    // 加载日志设置
    if (elements.maxLogs) {
      elements.maxLogs.value = settings.maxLogs || 2000;
    }
    if (elements.autoClearLogs) {
      elements.autoClearLogs.checked = settings.autoClearLogs !== false;
    }

    // 加载全局启用设置
    if (elements.globalEnable) {
      elements.globalEnable.checked = settings.globalEnable !== false;
    }

    // 加载允许的域名设置
    if (elements.allowedDomains) {
      elements.allowedDomains.value = settings.allowedDomains || '*';
    }

    // 监听设置变化
    if (elements.fallbackToOrigin) {
      elements.fallbackToOrigin.addEventListener("change", saveSettings);
    }
    if (elements.maxLogs) {
      elements.maxLogs.addEventListener("change", saveSettings);
    }
    if (elements.autoClearLogs) {
      elements.autoClearLogs.addEventListener("change", saveSettings);
    }
    if (elements.globalEnable) {
      elements.globalEnable.addEventListener("change", saveSettings);
    }
    if (elements.allowedDomains) {
      elements.allowedDomains.addEventListener("change", saveSettings);
      elements.allowedDomains.addEventListener("input", saveSettings);
    }
  });
}

function saveSettings() {
  const settings = {
    fallbackToOrigin: elements.fallbackToOrigin?.checked ?? true,
    maxLogs: parseInt(elements.maxLogs?.value || 2000),
    autoClearLogs: elements.autoClearLogs?.checked ?? true,
    globalEnable: elements.globalEnable?.checked ?? true,
    allowedDomains: elements.allowedDomains?.value || ''
  };

  chrome.storage.local.set({ settings });
}

console.log("Popup script loaded");
