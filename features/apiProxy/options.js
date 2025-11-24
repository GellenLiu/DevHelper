/**
 * options.js - 新窗口模式下的选项页面管理
 * 这个文件简化了 popup.js 的逻辑，用于在新窗口中运行
 */

(function() {
    'use strict';

    // 初始化变量
    let currentEditingRuleId = null;
    let allRules = [];
    let allLogs = [];
    let filteredLogs = [];

    // ==================== DOM 元素初始化 ====================
    let elements = {};

    function initializeElements() {
        // 导航
        elements.navButtons = document.querySelectorAll('.nav-btn');
        elements.tabs = document.querySelectorAll('.tab-content');

        // 规则相关
        elements.addRuleBtn = document.getElementById('add-rule-btn');
        elements.importRulesBtn = document.getElementById('import-rules-btn');
        elements.exportRulesBtn = document.getElementById('export-rules-btn');
        elements.rulesList = document.getElementById('rules-list');
        elements.ruleEditor = document.getElementById('rule-editor');
        elements.closeEditor = document.getElementById('close-editor');
        elements.editorTitle = document.getElementById('editor-title');

        // 规则输入字段
        elements.ruleName = document.getElementById('rule-name');
        elements.sourcePattern = document.getElementById('source-pattern');
        elements.targetUrl = document.getElementById('target-url');
        elements.ruleMethod = document.getElementById('rule-method');
        elements.ruleDesc = document.getElementById('rule-desc');
        elements.enableCookies = document.getElementById('enable-cookies');
        elements.cookieSettings = document.getElementById('cookie-settings');
        elements.autoCookies = document.getElementById('auto-cookies');
        elements.manageCookiesBtn = document.getElementById('manage-cookies-btn');
        elements.refreshCookiesBtn = document.getElementById('refresh-cookies-btn');
        elements.cookieManager = document.getElementById('cookie-manager');
        elements.closeCookieManager = document.getElementById('close-cookie-manager');
        elements.addHeaderBtn = document.getElementById('add-header-btn');
        elements.headersList = document.getElementById('headers-list');
        elements.saveRuleBtn = document.getElementById('save-rule-btn');
        elements.cancelEditBtn = document.getElementById('cancel-edit-btn');

        // Cookie 管理相关
        elements.autoCoookiesList = document.getElementById('auto-cookies-list');
        elements.noAutoCookies = document.getElementById('no-auto-cookies');
        elements.cookieName = document.getElementById('cookie-name');
        elements.cookieValue = document.getElementById('cookie-value');
        elements.addCookieBtn = document.getElementById('add-cookie-btn');
        elements.manualCookiesList = document.getElementById('manual-cookies-list');
        elements.noManualCookies = document.getElementById('no-manual-cookies');
        elements.closeCookieManagerBtn = document.getElementById('close-cookie-manager-btn');

        // 日志相关
        elements.logsList = document.getElementById('logs-list');
        elements.searchLogs = document.getElementById('search-logs');
        elements.filterType = document.getElementById('filter-type');
        elements.clearLogsBtn = document.getElementById('clear-logs-btn');
        elements.exportLogsBtn = document.getElementById('export-logs-btn');
        elements.logDetail = document.getElementById('log-detail');
        elements.logDetailContent = document.getElementById('log-detail-content');
        elements.copyLogBtn = document.getElementById('copy-log-btn');
        elements.closeLogDetail = document.getElementById('close-log-detail');

        // 统计数据
        elements.ruleCount = document.getElementById('rule-count');
        elements.enabledCount = document.getElementById('enabled-count');
        elements.totalLogs = document.getElementById('total-logs');
        elements.requestCount = document.getElementById('request-count');
        elements.responseCount = document.getElementById('response-count');

        // 设置相关
        elements.maxLogs = document.getElementById('max-logs');
        elements.autoClearLogs = document.getElementById('auto-clear-logs');
        elements.fallbackToOrigin = document.getElementById('fallback-to-origin');
        elements.exportAllBtn = document.getElementById('export-all-btn');
        elements.importAllBtn = document.getElementById('import-all-btn');
        elements.resetBtn = document.getElementById('reset-btn');
    }

    // ==================== 初始化函数 ====================
    function initialize() {
        initializeElements();
        registerEventListeners();
        loadAllData();
        updateStats();
    }

    // ==================== 事件监听器注册 ====================
    function registerEventListeners() {
        // 导航栏事件 - 使用事件委托
        document.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.nav-btn');
            if (navBtn) {
                handleNavigation(navBtn);
            }
        });

        // 规则面板事件 - 使用事件委托
        document.addEventListener('click', (e) => {
            if (e.target.id === 'add-rule-btn') {
                handleAddRule();
            }
            if (e.target.id === 'import-rules-btn') {
                handleImportRules();
            }
            if (e.target.id === 'export-rules-btn') {
                handleExportRules();
            }
            if (e.target.id === 'close-editor') {
                handleCloseEditor();
            }
            if (e.target.id === 'save-rule-btn') {
                handleSaveRule();
            }
            if (e.target.id === 'cancel-edit-btn') {
                handleCloseEditor();
            }
            if (e.target.id === 'add-header-btn') {
                handleAddHeader();
            }
            if (e.target.id === 'manage-cookies-btn') {
                handleManageCookies();
            }
            if (e.target.id === 'close-cookie-manager') {
                handleCloseCookieManager();
            }
            if (e.target.id === 'add-cookie-btn') {
                handleAddCookie();
            }
            if (e.target.id === 'close-cookie-manager-btn') {
                handleCloseCookieManager();
            }
        });

        // 规则列表动作事件
        document.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;

            const ruleItem = e.target.closest('.rule-item');
            if (!ruleItem) return;

            const ruleId = ruleItem.getAttribute('data-rule-id');
            handleRuleAction(action, ruleId);
        });

        // 日志列表事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('log-item')) {
                handleShowLogDetail(e.target);
            }
            if (e.target.id === 'clear-logs-btn') {
                handleClearLogs();
            }
            if (e.target.id === 'export-logs-btn') {
                handleExportLogs();
            }
            if (e.target.id === 'copy-log-btn') {
                handleCopyLog();
            }
            if (e.target.id === 'close-log-detail') {
                handleCloseLogDetail();
            }
        });

        // 日志搜索和过滤
        if (elements.searchLogs) {
            elements.searchLogs.addEventListener('input', () => {
                updateLogs();
            });
        }

        if (elements.filterType) {
            elements.filterType.addEventListener('change', () => {
                updateLogs();
            });
        }

        // Cookie 勾选框监听
        if (elements.enableCookies) {
            elements.enableCookies.addEventListener('change', (e) => {
                if (e.target.checked) {
                    elements.cookieSettings.style.display = 'block';
                } else {
                    elements.cookieSettings.style.display = 'none';
                }
            });
        }

        // 刷新 Cookie
        if (elements.refreshCookiesBtn) {
            elements.refreshCookiesBtn.addEventListener('click', handleRefreshCookies);
        }

        // 设置事件
        document.addEventListener('click', (e) => {
            if (e.target.id === 'export-all-btn') {
                handleExportAll();
            }
            if (e.target.id === 'import-all-btn') {
                handleImportAll();
            }
            if (e.target.id === 'reset-btn') {
                handleReset();
            }
        });
    }

    // ==================== 导航处理 ====================
    function handleNavigation(btn) {
        const tabName = btn.getAttribute('data-tab');

        // 更新按钮状态
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');

        // 更新标签页
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(tabName + '-tab').classList.add('active');

        // 切换到日志时刷新
        if (tabName === 'logs') {
            updateLogs();
        }
    }

    // ==================== 规则操作 ====================
    function handleAddRule() {
        currentEditingRuleId = null;
        elements.editorTitle.textContent = '添加新规则';
        clearRuleForm();
        elements.ruleEditor.style.display = 'block';
    }

    function handleCloseEditor() {
        elements.ruleEditor.style.display = 'none';
        clearRuleForm();
        currentEditingRuleId = null;
    }

    function clearRuleForm() {
        elements.ruleName.value = '';
        elements.sourcePattern.value = '';
        elements.targetUrl.value = '';
        elements.ruleMethod.value = 'ALL';
        elements.ruleDesc.value = '';
        elements.enableCookies.checked = false;
        elements.cookieSettings.style.display = 'none';
        elements.autoCookies.checked = true;
        elements.headersList.innerHTML = '';
    }

    function handleSaveRule() {
        const name = elements.ruleName.value.trim();
        const sourcePattern = elements.sourcePattern.value.trim();
        const targetUrl = elements.targetUrl.value.trim();
        const method = elements.ruleMethod.value;
        const desc = elements.ruleDesc.value.trim();
        const enableCookies = elements.enableCookies.checked;
        const autoCookies = elements.autoCookies.checked;

        if (!name || !sourcePattern || !targetUrl) {
            alert('请填写必要字段：规则名称、源URL模式、目标URL');
            return;
        }

        const headers = {};
        document.querySelectorAll('.header-item').forEach(item => {
            const key = item.querySelector('[data-field="key"]').value.trim();
            const value = item.querySelector('[data-field="value"]').value.trim();
            if (key) headers[key] = value;
        });

        const rule = {
            id: currentEditingRuleId || Date.now().toString(),
            name: name,
            sourcePattern: sourcePattern,
            targetUrl: targetUrl,
            method: method,
            description: desc,
            enabled: currentEditingRuleId ? (allRules.find(r => r.id === currentEditingRuleId)?.enabled ?? true) : true,
            cookies: {
                enabled: enableCookies,
                auto: autoCookies,
                manual: {}
            },
            headers: headers,
            createdAt: currentEditingRuleId ? (allRules.find(r => r.id === currentEditingRuleId)?.createdAt ?? Date.now()) : Date.now()
        };

        if (currentEditingRuleId) {
            const index = allRules.findIndex(r => r.id === currentEditingRuleId);
            if (index !== -1) {
                allRules[index] = rule;
            }
        } else {
            allRules.push(rule);
        }

        saveRules();
        updateRulesList();
        handleCloseEditor();
        updateStats();
    }

    function handleRuleAction(action, ruleId) {
        const ruleIndex = allRules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) return;

        switch (action) {
            case 'toggle':
                allRules[ruleIndex].enabled = !allRules[ruleIndex].enabled;
                saveRules();
                updateRulesList();
                updateStats();
                break;
            case 'edit':
                handleEditRule(ruleId);
                break;
            case 'delete':
                if (confirm('确认删除此规则？')) {
                    allRules.splice(ruleIndex, 1);
                    saveRules();
                    updateRulesList();
                    updateStats();
                }
                break;
            case 'duplicate':
                handleDuplicateRule(ruleIndex);
                break;
        }
    }

    function handleEditRule(ruleId) {
        const rule = allRules.find(r => r.id === ruleId);
        if (!rule) return;

        currentEditingRuleId = ruleId;
        elements.editorTitle.textContent = '编辑规则';

        elements.ruleName.value = rule.name;
        elements.sourcePattern.value = rule.sourcePattern;
        elements.targetUrl.value = rule.targetUrl;
        elements.ruleMethod.value = rule.method;
        elements.ruleDesc.value = rule.description || '';
        elements.enableCookies.checked = rule.cookies?.enabled || false;
        elements.autoCookies.checked = rule.cookies?.auto ?? true;

        if (elements.enableCookies.checked) {
            elements.cookieSettings.style.display = 'block';
        }

        // 加载 headers
        elements.headersList.innerHTML = '';
        if (rule.headers) {
            Object.entries(rule.headers).forEach(([key, value]) => {
                addHeaderRow(key, value);
            });
        }

        elements.ruleEditor.style.display = 'block';
    }

    function handleDuplicateRule(ruleIndex) {
        const oldRule = allRules[ruleIndex];
        const newRule = JSON.parse(JSON.stringify(oldRule));
        newRule.id = Date.now().toString();
        newRule.name = oldRule.name + ' (副本)';
        allRules.push(newRule);
        saveRules();
        updateRulesList();
        updateStats();
    }

    function handleAddHeader() {
        addHeaderRow('', '');
    }

    function addHeaderRow(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'header-item';
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.marginBottom = '8px';

        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'Header 名称';
        keyInput.value = key;
        keyInput.setAttribute('data-field', 'key');
        keyInput.style.flex = '1';

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.placeholder = 'Header 值';
        valueInput.value = value;
        valueInput.setAttribute('data-field', 'value');
        valueInput.style.flex = '2';

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '删除';
        removeBtn.className = 'btn btn-secondary';
        removeBtn.style.padding = '4px 12px';
        removeBtn.onclick = () => row.remove();

        row.appendChild(keyInput);
        row.appendChild(valueInput);
        row.appendChild(removeBtn);

        elements.headersList.appendChild(row);
    }

    function handleImportRules() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (Array.isArray(imported)) {
                        allRules = allRules.concat(imported);
                        saveRules();
                        updateRulesList();
                        updateStats();
                        alert('规则导入成功！');
                    }
                } catch (error) {
                    alert('导入失败：' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function handleExportRules() {
        const dataStr = JSON.stringify(allRules, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'api-proxy-rules.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==================== Cookie 操作 ====================
    function handleManageCookies() {
        elements.cookieManager.style.display = 'block';
        loadCookies();
    }

    function handleCloseCookieManager() {
        elements.cookieManager.style.display = 'none';
    }

    function loadCookies() {
        // 实现 Cookie 加载逻辑
    }

    function handleAddCookie() {
        // 实现 Cookie 添加逻辑
    }

    function handleRefreshCookies() {
        // 实现 Cookie 刷新逻辑
    }

    // ==================== 日志操作 ====================
    function updateLogs() {
        const searchText = (elements.searchLogs?.value || '').toLowerCase();
        const filterType = elements.filterType?.value || '';

        filteredLogs = allLogs.filter(log => {
            const matchSearch = !searchText || 
                (log.sourceUrl && log.sourceUrl.toLowerCase().includes(searchText)) ||
                (log.targetUrl && log.targetUrl.toLowerCase().includes(searchText)) ||
                (log.message && log.message.toLowerCase().includes(searchText));

            const matchType = !filterType || log.type === filterType;

            return matchSearch && matchType;
        });

        renderLogsList();
    }

    function renderLogsList() {
        if (!elements.logsList) return;

        elements.logsList.innerHTML = '';

        if (filteredLogs.length === 0) {
            elements.logsList.innerHTML = '<div class="empty-state">暂无日志</div>';
            return;
        }

        filteredLogs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            logItem.style.cursor = 'pointer';

            const time = new Date(log.timestamp).toLocaleTimeString();
            const sourceUrl = log.sourceUrl ? log.sourceUrl.substring(0, 50) : '未知';
            const targetUrl = log.targetUrl ? log.targetUrl.substring(0, 50) : '未知';

            logItem.innerHTML = `
                <div class="log-info">
                    <span class="log-time">${time}</span>
                    <span class="log-type" style="background: ${getLogColor(log.type)}">${log.type}</span>
                    <span class="log-url">${sourceUrl}</span>
                </div>
            `;

            logItem.addEventListener('click', () => {
                handleShowLogDetail(logItem, log);
            });

            elements.logsList.appendChild(logItem);
        });
    }

    function getLogColor(type) {
        const colors = {
            'request': '#2196F3',
            'response': '#4CAF50',
            'error': '#F44336'
        };
        return colors[type] || '#999';
    }

    function handleShowLogDetail(item, log) {
        if (!log) {
            // 从 item 中提取日志数据
            log = filteredLogs[Array.from(elements.logsList.children).indexOf(item)];
        }

        if (!log) return;

        let detailHtml = '<div class="log-detail-sections">';

        // 请求信息
        if (log.type === 'request' || log.type === 'response') {
            detailHtml += `
                <div class="log-section">
                    <h4>请求信息</h4>
                    <div class="detail-item">
                        <span class="label">原始 URL:</span>
                        <span class="value">${log.sourceUrl || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">目标 URL:</span>
                        <span class="value">${log.targetUrl || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">请求方法:</span>
                        <span class="value">${log.method || '未知'}</span>
                    </div>
                    ${log.params ? `<div class="detail-item">
                        <span class="label">参数:</span>
                        <pre>${JSON.stringify(log.params, null, 2)}</pre>
                    </div>` : ''}
                </div>
            `;
        }

        // 响应信息
        if (log.type === 'response') {
            detailHtml += `
                <div class="log-section">
                    <h4>响应信息</h4>
                    <div class="detail-item">
                        <span class="label">响应代码:</span>
                        <span class="value">${log.status || '未知'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">响应时间:</span>
                        <span class="value">${log.duration || '未知'}ms</span>
                    </div>
                    ${log.data ? `<div class="detail-item">
                        <span class="label">响应数据:</span>
                        <pre>${typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}</pre>
                    </div>` : ''}
                </div>
            `;
        }

        // 错误信息
        if (log.type === 'error') {
            detailHtml += `
                <div class="log-section">
                    <h4>错误信息</h4>
                    <div class="detail-item">
                        <span class="label">错误:</span>
                        <span class="value">${log.message || '未知'}</span>
                    </div>
                    ${log.stack ? `<div class="detail-item">
                        <span class="label">堆栈:</span>
                        <pre>${log.stack}</pre>
                    </div>` : ''}
                </div>
            `;
        }

        detailHtml += '</div>';
        elements.logDetailContent.innerHTML = detailHtml;
        elements.logDetail.style.display = 'block';

        // 保存当前日志用于复制
        elements.logDetail.currentLog = log;
    }

    function handleCloseLogDetail() {
        elements.logDetail.style.display = 'none';
    }

    function handleClearLogs() {
        if (confirm('确认清空所有日志？')) {
            allLogs = [];
            saveLogs();
            updateLogs();
            updateStats();
        }
    }

    function handleExportLogs() {
        const dataStr = JSON.stringify(filteredLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'api-proxy-logs.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleCopyLog() {
        const log = elements.logDetail.currentLog;
        if (log) {
            const logStr = JSON.stringify(log, null, 2);
            navigator.clipboard.writeText(logStr).then(() => {
                alert('已复制到剪贴板');
            });
        }
    }

    // ==================== 数据存储操作 ====================
    function loadAllData() {
        chrome.storage.local.get(['rules', 'logs', 'settings'], (result) => {
            allRules = result.rules || [];
            allLogs = result.logs || [];
            const settings = result.settings || {};
            
            // 加载设置项
            if (elements.maxLogs) {
                elements.maxLogs.value = settings.maxLogs || 2000;
            }
            if (elements.autoClearLogs) {
                elements.autoClearLogs.checked = settings.autoClearLogs !== false;
            }
            if (elements.fallbackToOrigin) {
                elements.fallbackToOrigin.checked = settings.fallbackToOrigin !== false;
            }
            
            // 监听设置变化
            if (elements.maxLogs) {
                elements.maxLogs.addEventListener('change', saveSettings);
            }
            if (elements.autoClearLogs) {
                elements.autoClearLogs.addEventListener('change', saveSettings);
            }
            if (elements.fallbackToOrigin) {
                elements.fallbackToOrigin.addEventListener('change', saveSettings);
            }
            
            updateRulesList();
            updateStats();
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

    function updateRulesList() {
        if (!elements.rulesList) return;

        elements.rulesList.innerHTML = '';

        if (allRules.length === 0) {
            elements.rulesList.innerHTML = '<div class="empty-state">暂无规则，点击"添加新规则"创建</div>';
            return;
        }

        allRules.forEach(rule => {
            const ruleItem = document.createElement('div');
            ruleItem.className = 'rule-item';
            ruleItem.setAttribute('data-rule-id', rule.id);

            const statusClass = rule.enabled ? 'enabled' : 'disabled';
            const statusText = rule.enabled ? '启用' : '禁用';

            ruleItem.innerHTML = `
                <div class="rule-header">
                    <h3>${rule.name}</h3>
                    <span class="rule-status ${statusClass}">${statusText}</span>
                </div>
                <div class="rule-details">
                    <div class="detail">
                        <span class="label">源URL:</span>
                        <span class="value">${rule.sourcePattern}</span>
                    </div>
                    <div class="detail">
                        <span class="label">目标URL:</span>
                        <span class="value">${rule.targetUrl}</span>
                    </div>
                    <div class="detail">
                        <span class="label">方法:</span>
                        <span class="value">${rule.method}</span>
                    </div>
                </div>
                <div class="rule-actions">
                    <button class="btn btn-secondary" data-action="toggle">${rule.enabled ? '禁用' : '启用'}</button>
                    <button class="btn btn-secondary" data-action="edit">编辑</button>
                    <button class="btn btn-secondary" data-action="duplicate">复制</button>
                    <button class="btn btn-danger" data-action="delete">删除</button>
                </div>
            `;

            elements.rulesList.appendChild(ruleItem);
        });
    }

    function updateStats() {
        if (elements.ruleCount) {
            elements.ruleCount.textContent = `规则: ${allRules.length}`;
        }

        const enabledRules = allRules.filter(r => r.enabled).length;
        if (elements.enabledCount) {
            elements.enabledCount.textContent = `启用: ${enabledRules}`;
        }

        if (elements.totalLogs) {
            elements.totalLogs.textContent = `总计: ${allLogs.length}`;
        }

        const requestLogs = allLogs.filter(l => l.type === 'request').length;
        if (elements.requestCount) {
            elements.requestCount.textContent = `请求: ${requestLogs}`;
        }

        const responseLogs = allLogs.filter(l => l.type === 'response').length;
        if (elements.responseCount) {
            elements.responseCount.textContent = `响应: ${responseLogs}`;
        }
    }

    function saveRules() {
        chrome.storage.local.set({ rules: allRules });
    }

    function saveLogs() {
        chrome.storage.local.set({ logs: allLogs });
    }

    function handleExportAll() {
        const data = {
            rules: allRules,
            logs: allLogs,
            exportTime: new Date().toISOString()
        };
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'api-proxy-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleImportAll() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.rules) allRules = data.rules;
                    if (data.logs) allLogs = data.logs;
                    saveRules();
                    saveLogs();
                    updateRulesList();
                    updateLogs();
                    updateStats();
                    alert('数据导入成功！');
                } catch (error) {
                    alert('导入失败：' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function handleReset() {
        if (confirm('确认重置所有设置？此操作无法撤销！')) {
            allRules = [];
            allLogs = [];
            chrome.storage.local.clear();
            updateRulesList();
            updateLogs();
            updateStats();
            alert('已重置所有设置');
        }
    }

    // ==================== 启动 ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
