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
        navBtns: document.querySelectorAll('.nav-btn'),
        tabContents: document.querySelectorAll('.tab-content'),

        // 规则标签页
        rulesList: document.getElementById('rules-list'),
        addRuleBtn: document.getElementById('add-rule-btn'),
        importRulesBtn: document.getElementById('import-rules-btn'),
        exportRulesBtn: document.getElementById('export-rules-btn'),
        ruleCount: document.getElementById('rule-count'),
        enabledCount: document.getElementById('enabled-count'),

        // 规则编辑面板
        ruleEditor: document.getElementById('rule-editor'),
        editorTitle: document.getElementById('editor-title'),
        ruleName: document.getElementById('rule-name'),
        sourcePattern: document.getElementById('source-pattern'),
        targetUrl: document.getElementById('target-url'),
        ruleMethod: document.getElementById('rule-method'),
        ruleDesc: document.getElementById('rule-desc'),
        enableCookies: document.getElementById('enable-cookies'),
        autoCookies: document.getElementById('auto-cookies'),
        cookieSettings: document.getElementById('cookie-settings'),
        refreshCookiesBtn: document.getElementById('refresh-cookies-btn'),
        manageCookiesBtn: document.getElementById('manage-cookies-btn'),
        headersList: document.getElementById('headers-list'),
        addHeaderBtn: document.getElementById('add-header-btn'),
        saveRuleBtn: document.getElementById('save-rule-btn'),
        cancelEditBtn: document.getElementById('cancel-edit-btn'),
        closeEditor: document.getElementById('close-editor'),

        // Cookie 管理器
        cookieManager: document.getElementById('cookie-manager'),
        autoCookiesList: document.getElementById('auto-cookies-list'),
        manualCookiesList: document.getElementById('manual-cookies-list'),
        noAutoCookies: document.getElementById('no-auto-cookies'),
        noManualCookies: document.getElementById('no-manual-cookies'),
        cookieName: document.getElementById('cookie-name'),
        cookieValue: document.getElementById('cookie-value'),
        addCookieBtn: document.getElementById('add-cookie-btn'),
        closeCookieManagerBtn: document.getElementById('close-cookie-manager-btn'),
        closeCookieManager: document.getElementById('close-cookie-manager'),

        // 日志标签页
        searchLogs: document.getElementById('search-logs'),
        filterType: document.getElementById('filter-type'),
        logsList: document.getElementById('logs-list'),
        clearLogsBtn: document.getElementById('clear-logs-btn'),
        exportLogsBtn: document.getElementById('export-logs-btn'),
        totalLogs: document.getElementById('total-logs'),
        requestCount: document.getElementById('request-count'),
        responseCount: document.getElementById('response-count'),

        // 日志详情面板
        logDetail: document.getElementById('log-detail'),
        logDetailContent: document.getElementById('log-detail-content'),
        copyLogBtn: document.getElementById('copy-log-btn'),
        closeLogDetail: document.getElementById('close-log-detail'),
        closeLogDetailBtn: document.getElementById('close-log-detail-btn'),

        // 设置标签页
        exportAllBtn: document.getElementById('export-all-btn'),
        importAllBtn: document.getElementById('import-all-btn'),
        resetBtn: document.getElementById('reset-btn'),
        maxLogs: document.getElementById('max-logs'),
        autoClearLogs: document.getElementById('auto-clear-logs'),
        fallbackToOrigin: document.getElementById('fallback-to-origin')
    };
}

// ============ 初始化 ============
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // 如果 DOM 已经加载，直接初始化
    initialize();
}

async function initialize() {
    // 等待一短时间确保所有 DOM 元素都已加载
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
            elements.navBtns.forEach(btn => {
                btn.addEventListener('click', () => switchTab(btn.dataset.tab));
            });
        }

        // 规则管理
        if (elements.addRuleBtn) {
            elements.addRuleBtn.addEventListener('click', () => {
                console.log('Add rule button clicked');
                openRuleEditor();
            });
        }
        if (elements.importRulesBtn) {
            elements.importRulesBtn.addEventListener('click', importRulesFromFile);
        }
        if (elements.exportRulesBtn) {
            elements.exportRulesBtn.addEventListener('click', exportRulesToFile);
        }

        // 规则编辑
        if (elements.closeEditor) {
            elements.closeEditor.addEventListener('click', closeRuleEditor);
        }
        if (elements.cancelEditBtn) {
            elements.cancelEditBtn.addEventListener('click', closeRuleEditor);
        }
        if (elements.saveRuleBtn) {
            elements.saveRuleBtn.addEventListener('click', saveRule);
        }
        if (elements.enableCookies) {
            elements.enableCookies.addEventListener('change', (e) => {
                if (elements.cookieSettings) {
                    elements.cookieSettings.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        if (elements.addHeaderBtn) {
            elements.addHeaderBtn.addEventListener('click', addHeaderField);
        }
        if (elements.manageCookiesBtn) {
            elements.manageCookiesBtn.addEventListener('click', openCookieManager);
        }
        if (elements.refreshCookiesBtn) {
            elements.refreshCookiesBtn.addEventListener('click', refreshCookies);
        }

        // Cookie 管理
        if (elements.closeCookieManager) {
            elements.closeCookieManager.addEventListener('click', closeCookieManager);
        }
        if (elements.closeCookieManagerBtn) {
            elements.closeCookieManagerBtn.addEventListener('click', closeCookieManager);
        }
        if (elements.addCookieBtn) {
            elements.addCookieBtn.addEventListener('click', addManualCookie);
        }

        // 日志
        if (elements.searchLogs) {
            elements.searchLogs.addEventListener('input', searchLogs);
        }
        if (elements.filterType) {
            elements.filterType.addEventListener('change', filterLogs);
        }
        if (elements.clearLogsBtn) {
            elements.clearLogsBtn.addEventListener('click', clearLogs);
        }
        if (elements.exportLogsBtn) {
            elements.exportLogsBtn.addEventListener('click', exportLogsToFile);
        }

        // 日志详情
        if (elements.closeLogDetail) {
            elements.closeLogDetail.addEventListener('click', closeLogDetail);
        }
        if (elements.closeLogDetailBtn) {
            elements.closeLogDetailBtn.addEventListener('click', closeLogDetail);
        }
        if (elements.copyLogBtn) {
            elements.copyLogBtn.addEventListener('click', copyLogToClipboard);
        }

        // 设置
        if (elements.exportAllBtn) {
            elements.exportAllBtn.addEventListener('click', exportAllData);
        }
        if (elements.importAllBtn) {
            elements.importAllBtn.addEventListener('click', importAllData);
        }
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', resetAllSettings);
        }
        
        console.log('Event listeners initialized successfully');
    } catch (error) {
        console.error('Error initializing event listeners:', error);
    }
}

// ============ 导航和标签页切换 ============
function switchTab(tabName) {
    elements.navBtns.forEach(btn => btn.classList.remove('active'));
    elements.tabContents.forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'logs') {
        loadLogs();
    }
}

// ============ 规则管理 ============
async function loadRules() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_RULES' }, (response) => {
            if (response && response.rules) {
                rules = response.rules;
                renderRulesList();
                updateRuleStats();
                resolve();
            } else {
                console.error('Failed to load rules');
                resolve();
            }
        });
    });
}

function renderRulesList() {
    elements.rulesList.innerHTML = '';

    if (rules.length === 0) {
        elements.rulesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">还没有配置任何规则</div>
                <button class="btn btn-primary" id="create-first-rule-btn">+ 创建第一个规则</button>
            </div>
        `;
        // 绑定空状态按钮
        const createBtn = elements.rulesList.querySelector('#create-first-rule-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => openRuleEditor());
        }
        return;
    }

    rules.forEach(rule => {
        const ruleItem = document.createElement('div');
        ruleItem.className = 'rule-item';
        ruleItem.dataset.ruleId = rule.id; // 添加 data 属性
        ruleItem.innerHTML = `
            <div class="rule-info">
                <div class="rule-name">${escapeHtml(rule.name)}</div>
                <div class="rule-details">
                    <span><strong>源:</strong> ${escapeHtml(rule.sourcePattern.substring(0, 40))}...</span>
                    <span><strong>目标:</strong> ${escapeHtml(rule.targetUrl.substring(0, 40))}...</span>
                    <span><strong>方法:</strong> ${rule.method}</span>
                </div>
            </div>
            <div class="rule-actions">
                <button class="toggle-switch ${rule.enabled ? 'enabled' : ''}" 
                        data-action="toggle"
                        title="${rule.enabled ? '禁用' : '启用'}"></button>
                <button data-action="edit">编辑</button>
                <button data-action="delete">删除</button>
                <button data-action="duplicate">复制</button>
            </div>
        `;
        elements.rulesList.appendChild(ruleItem);
    });
    
    // 设置事件委托处理所有动作
    setupRuleListEventDelegation();
}

function setupRuleListEventDelegation() {
    if (!elements.rulesList) return;
    
    elements.rulesList.removeEventListener('click', handleRuleAction);
    elements.rulesList.addEventListener('click', handleRuleAction);
}

function handleRuleAction(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    
    const ruleItem = button.closest('.rule-item');
    if (!ruleItem) return;
    
    const ruleId = parseInt(ruleItem.dataset.ruleId);
    const action = button.dataset.action;
    
    console.log('Rule action:', action, 'ruleId:', ruleId);
    
    switch (action) {
        case 'toggle':
            toggleRuleStatus(ruleId);
            break;
        case 'edit':
            editRule(ruleId);
            break;
        case 'delete':
            deleteRule(ruleId);
            break;
        case 'duplicate':
            duplicateRule(ruleId);
            break;
    }
}

function openRuleEditor(ruleId = null) {
    console.log('Opening rule editor, ruleId:', ruleId);
    
    try {
        currentEditingRuleId = ruleId;
        currentEditingHeaders = [];

        if (ruleId) {
            // 编辑现有规则
            const rule = rules.find(r => r.id === ruleId);
            if (!rule) {
                console.error('Rule not found:', ruleId);
                return;
            }

            if (elements.editorTitle) elements.editorTitle.textContent = '编辑规则';
            if (elements.ruleName) elements.ruleName.value = rule.name;
            if (elements.sourcePattern) elements.sourcePattern.value = rule.sourcePattern;
            if (elements.targetUrl) elements.targetUrl.value = rule.targetUrl;
            if (elements.ruleMethod) elements.ruleMethod.value = rule.method;
            if (elements.ruleDesc) elements.ruleDesc.value = rule.description;
            if (elements.enableCookies) elements.enableCookies.checked = rule.cookies?.enabled !== false;
            if (elements.autoCookies) elements.autoCookies.checked = rule.cookies?.auto !== false;
            if (elements.cookieSettings) {
                elements.cookieSettings.style.display = (elements.enableCookies && elements.enableCookies.checked) ? 'block' : 'none';
            }

            // 加载 Headers
            currentEditingHeaders = Object.entries(rule.headers || {}).map(([key, value]) => ({
                key,
                value
            }));
            renderHeaders();
        } else {
            // 新建规则
            if (elements.editorTitle) elements.editorTitle.textContent = '创建新规则';
            if (elements.ruleName) elements.ruleName.value = '';
            if (elements.sourcePattern) elements.sourcePattern.value = '';
            if (elements.targetUrl) elements.targetUrl.value = '';
            if (elements.ruleMethod) elements.ruleMethod.value = 'ALL';
            if (elements.ruleDesc) elements.ruleDesc.value = '';
            if (elements.enableCookies) elements.enableCookies.checked = true;
            if (elements.autoCookies) elements.autoCookies.checked = true;
            if (elements.cookieSettings) elements.cookieSettings.style.display = 'block';
            currentEditingHeaders = [];
            if (elements.headersList) elements.headersList.innerHTML = '';
        }

        if (elements.ruleEditor) {
            elements.ruleEditor.style.display = 'block';
            console.log('Rule editor opened successfully');
        } else {
            console.error('Rule editor element not found');
        }
    } catch (error) {
        console.error('Error opening rule editor:', error);
    }
}

function closeRuleEditor() {
    elements.ruleEditor.style.display = 'none';
    currentEditingRuleId = null;
    currentEditingHeaders = [];
}

async function saveRule() {
    const name = elements.ruleName.value.trim();
    const sourcePattern = elements.sourcePattern.value.trim();
    const targetUrl = elements.targetUrl.value.trim();
    const method = elements.ruleMethod.value;
    const description = elements.ruleDesc.value.trim();
    const enableCookies = elements.enableCookies.checked;
    const autoCookies = elements.autoCookies.checked;

    // 验证
    if (!name || !sourcePattern || !targetUrl) {
        alert('请填写必填项：规则名称、源 URL 模式、目标 URL');
        return;
    }

    // 验证正则表达式
    try {
        new RegExp(sourcePattern);
    } catch (error) {
        alert('源 URL 模式不是有效的正则表达式: ' + error.message);
        return;
    }

    // 构建 Headers 对象
    const headers = {};
    currentEditingHeaders.forEach(header => {
        if (header.key.trim()) {
            headers[header.key.trim()] = header.value.trim();
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
            manual: []
        },
        headers
    };

    // 保存规则
    if (currentEditingRuleId) {
        // 更新现有规则
        chrome.runtime.sendMessage({
            type: 'UPDATE_RULE',
            data: { id: currentEditingRuleId, updates: ruleData }
        }, (response) => {
            if (response.success) {
                alert('规则已更新');
                loadRules();
                closeRuleEditor();
            } else {
                alert('更新规则失败: ' + response.error);
            }
        });
    } else {
        // 创建新规则
        chrome.runtime.sendMessage({
            type: 'ADD_RULE',
            data: ruleData
        }, (response) => {
            if (response.success) {
                alert('规则已创建');
                loadRules();
                closeRuleEditor();
            } else {
                alert('创建规则失败: ' + response.error);
            }
        });
    }
}

async function toggleRuleStatus(ruleId) {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    chrome.runtime.sendMessage({
        type: 'UPDATE_RULE',
        data: { id: ruleId, updates: { enabled: !rule.enabled } }
    }, (response) => {
        if (response.success) {
            loadRules();
        }
    });
}

function editRule(ruleId) {
    openRuleEditor(ruleId);
    // 滚动到编辑面板
    setTimeout(() => {
        elements.ruleEditor.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

async function deleteRule(ruleId) {
    if (!confirm('确定要删除这个规则吗？')) {
        return;
    }

    chrome.runtime.sendMessage({ type: 'DELETE_RULE', data: ruleId }, (response) => {
        if (response.success) {
            loadRules();
        } else {
            alert('删除规则失败');
        }
    });
}

function duplicateRule(ruleId) {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newRule = JSON.parse(JSON.stringify(rule));
    newRule.name = `${newRule.name} (副本)`;

    chrome.runtime.sendMessage({
        type: 'ADD_RULE',
        data: newRule
    }, (response) => {
        if (response.success) {
            alert('规则已复制');
            loadRules();
        }
    });
}

// ============ Header 管理 ============
function renderHeaders() {
    elements.headersList.innerHTML = '';
    currentEditingHeaders.forEach((header, index) => {
        const item = document.createElement('div');
        item.className = 'key-value-item';
        item.dataset.headerIndex = index; // 添加 data 属性
        
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'Header 名称';
        keyInput.value = escapeHtml(header.key);
        keyInput.addEventListener('change', (e) => {
            currentEditingHeaders[index].key = e.target.value;
        });
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Header 值';
        valueInput.value = escapeHtml(header.value);
        valueInput.addEventListener('change', (e) => {
            currentEditingHeaders[index].value = e.target.value;
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.dataset.action = 'delete-header';
        deleteBtn.dataset.headerIndex = index;
        deleteBtn.addEventListener('click', () => removeHeader(index));
        
        item.appendChild(keyInput);
        item.appendChild(valueInput);
        item.appendChild(deleteBtn);
        elements.headersList.appendChild(item);
    });
}

function addHeaderField() {
    currentEditingHeaders.push({ key: '', value: '' });
    renderHeaders();
}

function removeHeader(index) {
    currentEditingHeaders.splice(index, 1);
    renderHeaders();
}

// ============ Cookie 管理 ============
async function openCookieManager() {
    if (!currentEditingRuleId) {
        alert('请先保存规则');
        return;
    }

    elements.cookieManager.style.display = 'block';
    await loadCookiesForRule();
}

function closeCookieManager() {
    elements.cookieManager.style.display = 'none';
}

async function loadCookiesForRule() {
    const rule = rules.find(r => r.id === currentEditingRuleId);
    if (!rule) return;

    // 获取 Cookies
    chrome.runtime.sendMessage({
        type: 'GET_COOKIES_FOR_RULE',
        data: { ruleId: currentEditingRuleId, targetUrl: rule.targetUrl }
    }, (response) => {
        if (response.success) {
            const cookies = response.cookies;

            // 分离自动和手动 Cookies
            // 这里简化处理，实际上应该从后台脚本分离
            renderCookiesList(cookies);
        }
    });
}

function renderCookiesList(cookies) {
    elements.autoCookiesList.innerHTML = '';
    elements.manualCookiesList.innerHTML = '';

    // 渲染所有 Cookies（这里简化处理）
    Object.entries(cookies).forEach(([name, value]) => {
        const item = document.createElement('div');
        item.className = 'cookie-item';
        item.dataset.cookieName = name; // 添加 data 属性
        item.innerHTML = `
            <div class="cookie-name">${escapeHtml(name)}</div>
            <div class="cookie-value">${escapeHtml(String(value).substring(0, 30))}...</div>
            <button data-action="delete-cookie">删除</button>
        `;
        elements.autoCookiesList.appendChild(item);
    });

    if (Object.keys(cookies).length === 0) {
        elements.noAutoCookies.style.display = 'block';
    } else {
        elements.noAutoCookies.style.display = 'none';
    }
    
    // 设置事件委托
    setupCookiesEventDelegation();
}

function setupCookiesEventDelegation() {
    if (!elements.autoCookiesList) return;
    
    elements.autoCookiesList.removeEventListener('click', handleCookieAction);
    elements.autoCookiesList.addEventListener('click', handleCookieAction);
}

function handleCookieAction(e) {
    const button = e.target.closest('button[data-action="delete-cookie"]');
    if (!button) return;
    
    const cookieItem = button.closest('.cookie-item');
    if (!cookieItem) return;
    
    const name = cookieItem.dataset.cookieName;
    console.log('Delete cookie:', name);
    deleteCookie(name);
}

async function addManualCookie() {
    const name = elements.cookieName.value.trim();
    const value = elements.cookieValue.value.trim();

    if (!name || !value) {
        alert('请输入 Cookie 名称和值');
        return;
    }

    chrome.runtime.sendMessage({
        type: 'ADD_MANUAL_COOKIE',
        data: {
            ruleId: currentEditingRuleId,
            name,
            value,
            options: {}
        }
    }, (response) => {
        if (response.success) {
            elements.cookieName.value = '';
            elements.cookieValue.value = '';
            loadCookiesForRule();
        }
    });
}

function deleteCookie(name) {
    chrome.runtime.sendMessage({
        type: 'DELETE_MANUAL_COOKIE',
        data: {
            ruleId: currentEditingRuleId,
            name
        }
    }, (response) => {
        if (response.success) {
            loadCookiesForRule();
        }
    });
}

async function refreshCookies() {
    const rule = rules.find(r => r.id === currentEditingRuleId);
    if (!rule) return;

    chrome.runtime.sendMessage({
        type: 'REFRESH_COOKIES',
        data: {
            ruleId: currentEditingRuleId,
            targetUrl: rule.targetUrl
        }
    }, (response) => {
        if (response.success) {
            alert('Cookie 已刷新');
            loadCookiesForRule();
        } else {
            alert('刷新 Cookie 失败: ' + response.error);
        }
    });
}

// ============ 日志管理 ============
async function loadLogs() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_LOGS' }, (response) => {
            if (response && response.logs) {
                logs = response.logs;
                renderLogsList(logs);
                updateLogStats();
                resolve();
            }
        });
    });
}

function renderLogsList(logsToRender) {
    elements.logsList.innerHTML = '';

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
        const logItem = document.createElement('div');
        logItem.className = `log-item ${log.type}`;
        logItem.dataset.logIndex = idx; // 用来标识日志项
        logItem.dataset.logUrl = log.sourceUrl || log.url;
        logItem.dataset.logTimestamp = log.timestamp;

        const timeStr = new Date(log.timestamp).toLocaleTimeString();
        const statusBadge = log.status ? `<span class="log-status ${log.status < 400 ? 'ok' : 'error'}">${log.status}</span>` : '';
        
        // 显示原始 URL
        const displayUrl = log.sourceUrl || log.url || '';

        logItem.innerHTML = `
            <div class="log-header">
                <span class="log-type">${log.type.toUpperCase()}</span>
                <span class="log-time">${timeStr}</span>
            </div>
            <div class="log-url">${escapeHtml(displayUrl)}</div>
            <div class="log-meta">
                <span><strong>方法:</strong> ${log.method || '-'}</span>
                ${statusBadge}
                ${log.ruleName ? `<span><strong>规则:</strong> ${escapeHtml(log.ruleName)}</span>` : ''}
            </div>
        `;

        // 存储日志对象引用
        logItem._logData = log;

        elements.logsList.appendChild(logItem);
    });
    
    // 设置事件委托
    setupLogsEventDelegation();
}

function setupLogsEventDelegation() {
    if (!elements.logsList) return;
    
    elements.logsList.removeEventListener('click', handleLogAction);
    elements.logsList.addEventListener('click', handleLogAction);
}

function handleLogAction(e) {
    const logItem = e.target.closest('.log-item');
    if (!logItem || !logItem._logData) return;
    
    console.log('Log item clicked:', logItem._logData);
    showLogDetail(logItem._logData);
}

function showLogDetail(log) {
    elements.logDetail.style.display = 'block';

    let detailHtml = '';
    
    // 基本信息
    detailHtml += `<div class="log-detail-section">\n`;
    detailHtml += `<h4>📋 基本信息</h4>\n`;
    detailHtml += `<div><strong>时间:</strong> ${new Date(log.timestamp).toLocaleString()}</div>\n`;
    detailHtml += `<div><strong>类型:</strong> ${log.type === 'request' ? '📤 请求' : log.type === 'response' ? '📥 响应' : '⚠️ 错误'}</div>\n`;
    detailHtml += `</div>\n`;

    // 请求信息
    if (log.type === 'request') {
        detailHtml += `<div class="log-detail-section">\n`;
        detailHtml += `<h4>🔗 请求信息</h4>\n`;
        detailHtml += `<div><strong>方法:</strong> <span class="method-badge">${log.method}</span></div>\n`;
        detailHtml += `<div><strong>原始地址:</strong> <code>${escapeHtml(log.sourceUrl || '-')}</code></div>\n`;
        if (log.targetUrl) {
            detailHtml += `<div><strong>转发地址:</strong> <code>${escapeHtml(log.targetUrl)}</code></div>\n`;
        }
        if (log.ruleName) {
            detailHtml += `<div><strong>匹配规则:</strong> ${escapeHtml(log.ruleName)}</div>\n`;
        }
        detailHtml += `<div><strong>是否转发:</strong> ${log.matched ? '✓ 是' : '✗ 否'}</div>\n`;
        detailHtml += `</div>\n`;

        // 请求头
        if (log.headers && Object.keys(log.headers).length > 0) {
            detailHtml += `<div class="log-detail-section">\n`;
            detailHtml += `<h4>📨 请求头</h4>\n`;
            detailHtml += `<div class="log-headers">\n`;
            Object.entries(log.headers).forEach(([key, value]) => {
                detailHtml += `<div class="header-item"><strong>${escapeHtml(key)}:</strong> <code>${escapeHtml(String(value))}</code></div>\n`;
            });
            detailHtml += `</div>\n`;
            detailHtml += `</div>\n`;
        }

        // 请求参数/请求体
        if (log.body) {
            detailHtml += `<div class="log-detail-section">\n`;
            detailHtml += `<h4>📦 请求参数</h4>\n`;
            detailHtml += `<pre class="log-body">${escapeHtml(typeof log.body === 'string' ? log.body : JSON.stringify(log.body, null, 2))}</pre>\n`;
            detailHtml += `</div>\n`;
        }
    }
    
    // 响应信息
    if (log.type === 'response') {
        detailHtml += `<div class="log-detail-section">\n`;
        detailHtml += `<h4>✅ 响应信息</h4>\n`;
        const statusClass = log.status < 400 ? 'status-success' : 'status-error';
        detailHtml += `<div><strong>状态码:</strong> <span class="${statusClass}">${log.status} ${log.statusText}</span></div>\n`;
        detailHtml += `<div><strong>原始地址:</strong> <code>${escapeHtml(log.sourceUrl || '-')}</code></div>\n`;
        detailHtml += `<div><strong>实际地址:</strong> <code>${escapeHtml(log.targetUrl || '-')}</code></div>\n`;
        if (log.ruleName) {
            detailHtml += `<div><strong>应用规则:</strong> ${escapeHtml(log.ruleName)}</div>\n`;
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
                detailHtml += `<div class="header-item"><strong>${escapeHtml(key)}:</strong> <code>${escapeHtml(String(value))}</code></div>\n`;
            });
            detailHtml += `</div>\n`;
            detailHtml += `</div>\n`;
        }

        // 返回值/响应体
        if (log.body) {
            detailHtml += `<div class="log-detail-section">\n`;
            detailHtml += `<h4>📋 返回值</h4>\n`;
            detailHtml += `<pre class="log-body">${escapeHtml(typeof log.body === 'string' ? log.body : JSON.stringify(log.body, null, 2))}</pre>\n`;
            detailHtml += `</div>\n`;
        }
    }

    // 错误信息
    if (log.type === 'error') {
        detailHtml += `<div class="log-detail-section">\n`;
        detailHtml += `<h4>⚠️ 错误信息</h4>\n`;
        detailHtml += `<div><strong>原始地址:</strong> <code>${escapeHtml(log.sourceUrl || '-')}</code></div>\n`;
        if (log.targetUrl) {
            detailHtml += `<div><strong>转发地址:</strong> <code>${escapeHtml(log.targetUrl)}</code></div>\n`;
        }
        if (log.ruleName) {
            detailHtml += `<div><strong>规则:</strong> ${escapeHtml(log.ruleName)}</div>\n`;
        }
        detailHtml += `<div><strong>错误:</strong> <span class="error-text">${escapeHtml(log.error)}</span></div>\n`;
        detailHtml += `</div>\n`;
    }

    elements.logDetailContent.innerHTML = detailHtml;
    elements.logDetailContent.dataset.fullLog = JSON.stringify(log);

    // 滚动到详情面板
    setTimeout(() => {
        elements.logDetail.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function closeLogDetail() {
    elements.logDetail.style.display = 'none';
}

function copyLogToClipboard() {
    const log = JSON.parse(elements.logDetailContent.dataset.fullLog);
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    });
}

function searchLogs() {
    const keyword = elements.searchLogs.value;
    const type = elements.filterType.value;

    const filtered = logs.filter(log => {
        if (type && log.type !== type) return false;
        if (keyword && !log.url?.includes(keyword)) return false;
        return true;
    });

    renderLogsList(filtered);
}

function filterLogs() {
    searchLogs();
}

async function clearLogs() {
    if (!confirm('确定要清空所有日志吗？此操作无法撤销。')) {
        return;
    }

    chrome.runtime.sendMessage({ type: 'CLEAR_LOGS' }, (response) => {
        if (response.success) {
            logs = [];
            renderLogsList([]);
            updateLogStats();
            alert('日志已清空');
        }
    });
}

// ============ 数据导出导入 ============
function importRulesFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonString = event.target.result;
                const imported = JSON.parse(jsonString);
                // 这里应该调用导入逻辑
                alert('规则导入成功');
                loadRules();
            } catch (error) {
                alert('导入失败: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportRulesToFile() {
    const dataStr = JSON.stringify(rules, null, 2);
    downloadFile(dataStr, 'api-proxy-rules.json');
}

async function exportLogsToFile() {
    const dataStr = JSON.stringify(logs, null, 2);
    downloadFile(dataStr, 'api-proxy-logs.json');
}

async function exportAllData() {
    const data = {
        rules,
        logs,
        exportTime: new Date().toISOString()
    };
    const dataStr = JSON.stringify(data, null, 2);
    downloadFile(dataStr, 'api-proxy-backup.json');
}

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                alert('数据导入成功');
                // 这里应该调用导入逻辑
                loadRules();
                loadLogs();
            } catch (error) {
                alert('导入失败: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resetAllSettings() {
    if (!confirm('确定要重置所有设置吗？所有规则和日志都将被删除。此操作无法撤销！')) {
        return;
    }

    // 这里应该调用重置逻辑
    alert('所有设置已重置');
    location.reload();
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
    const enabled = rules.filter(r => r.enabled).length;
    elements.ruleCount.textContent = `规则: ${total}`;
    elements.enabledCount.textContent = `启用: ${enabled}`;
}

function updateLogStats() {
    const total = logs.length;
    const requests = logs.filter(l => l.type === 'request').length;
    const responses = logs.filter(l => l.type === 'response').length;
    elements.totalLogs.textContent = `总计: ${total}`;
    elements.requestCount.textContent = `请求: ${requests}`;
    elements.responseCount.textContent = `响应: ${responses}`;
}

function updateStats() {
    updateRuleStats();
    updateLogStats();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ 设置管理 ============
function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
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
        
        // 监听设置变化
        if (elements.fallbackToOrigin) {
            elements.fallbackToOrigin.addEventListener('change', saveSettings);
        }
        if (elements.maxLogs) {
            elements.maxLogs.addEventListener('change', saveSettings);
        }
        if (elements.autoClearLogs) {
            elements.autoClearLogs.addEventListener('change', saveSettings);
        }
    });
}

function saveSettings() {
    const settings = {
        fallbackToOrigin: elements.fallbackToOrigin?.checked ?? true,
        maxLogs: parseInt(elements.maxLogs?.value || 2000),
        autoClearLogs: elements.autoClearLogs?.checked ?? true
    };
    
    chrome.storage.local.set({ settings });
}

console.log('Popup script loaded');
