// config.js - 环境配置修改器设置页面逻辑

// 存储键
const SETTINGS_KEY = 'envConfiguratorSettings';
const CUSTOM_CONFIGS_KEY = 'envConfiguratorCustomConfigs';
const DOMAINS_KEY = 'envConfiguratorDomains';

// 默认设置
const DEFAULT_SETTINGS = {
    defaultConfigName: 'default'
};

// 默认域名配置
const DEFAULT_DOMAINS = [];

// DOM元素
let defaultConfigNameInput;
let customConfigsList;
let saveSettingsBtn;
let resetSettingsBtn;
let importConfigBtn;
let exportConfigBtn;
let feedbackMessage;
// 域名配置相关DOM元素
let newDomainInput;
let addDomainBtn;
let domainListContainer;

// 当前设置
let currentSettings = { ...DEFAULT_SETTINGS };
let customConfigs = {};
let currentDomains = [...DEFAULT_DOMAINS];
// 防抖计时器
let debounceTimer;
// 防抖延迟时间(毫秒)
const DEBOUNCE_DELAY = 500;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    defaultConfigNameInput = document.getElementById('defaultConfigName');
    customConfigsList = document.getElementById('customConfigsList');
    saveSettingsBtn = document.getElementById('saveSettingsBtn');
    resetSettingsBtn = document.getElementById('resetSettingsBtn');
    importConfigBtn = document.getElementById('importConfigBtn');
    exportConfigBtn = document.getElementById('exportConfigBtn');
    feedbackMessage = document.getElementById('feedbackMessage');
    // 获取域名配置相关DOM元素
    newDomainInput = document.getElementById('newDomain');
    addDomainBtn = document.getElementById('addDomain');
    domainListContainer = document.getElementById('domainList');

    // 初始化事件监听
    initEventListeners();

    // 加载设置
    loadSettings();

    // 加载自定义配置
    loadCustomConfigs();

    // 加载域名配置
    loadDomains();

    // 初始化反馈消息元素
    initFeedbackMessage();
});

// 初始化事件监听
function initEventListeners() {
    // 保存设置按钮
    saveSettingsBtn.addEventListener('click', () => debounce(saveSettings, DEBOUNCE_DELAY));

    // 重置设置按钮
    resetSettingsBtn.addEventListener('click', resetSettings);

    // 导入配置按钮
    importConfigBtn?.addEventListener('click', importConfig);

    // 导出配置按钮
    exportConfigBtn?.addEventListener('click', exportConfig);

    // 输入框变更事件
    defaultConfigNameInput.addEventListener('input', () => debounce(saveSettings, DEBOUNCE_DELAY));

    // 域名配置相关事件监听
    addDomainBtn?.addEventListener('click', addDomain);
    newDomainInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addDomain();
        }
    });
}

// 初始化反馈消息元素
function initFeedbackMessage() {
    if (!feedbackMessage) {
        feedbackMessage = document.createElement('div');
        feedbackMessage.id = 'feedbackMessage';
        feedbackMessage.className = 'feedback-message';
        feedbackMessage.style.position = 'fixed';
        feedbackMessage.style.bottom = '20px';
        feedbackMessage.style.right = '20px';
        feedbackMessage.style.padding = '10px 20px';
        feedbackMessage.style.borderRadius = '4px';
        feedbackMessage.style.zIndex = '1000';
        feedbackMessage.style.display = 'none';
        document.body.appendChild(feedbackMessage);
    }
}

// 显示反馈消息
function showFeedback(message, type = 'success') {
    if (!feedbackMessage) {
        initFeedbackMessage();
    }

    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback-message';

    // 设置样式
    if (type === 'success') {
        feedbackMessage.style.backgroundColor = '#4CAF50';
        feedbackMessage.style.color = 'white';
    } else if (type === 'error') {
        feedbackMessage.style.backgroundColor = '#F44336';
        feedbackMessage.style.color = 'white';
    } else if (type === 'info') {
        feedbackMessage.style.backgroundColor = '#2196F3';
        feedbackMessage.style.color = 'white';
    }

    feedbackMessage.style.display = 'block';

    // 3秒后隐藏
    setTimeout(() => {
        feedbackMessage.style.display = 'none';
    }, 3000);
}

// 防抖函数
function debounce(func, delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(func, delay);
}

// 加载设置
function loadSettings() {
    try {
        chrome.storage.local.get([SETTINGS_KEY], (result) => {
            if (chrome.runtime.lastError) {
                console.error('加载设置失败:', chrome.runtime.lastError);
                showFeedback('加载设置失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            if (result[SETTINGS_KEY]) {
                currentSettings = { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
            }

            // 更新UI
            updateSettingsUI();
        });
    } catch (e) {
        console.error('加载设置异常:', e);
        showFeedback('加载设置异常: ' + e.message, 'error');
    }
}

// 加载自定义配置
function loadCustomConfigs() {
    try {
        chrome.storage.local.get([CUSTOM_CONFIGS_KEY], (result) => {
            if (chrome.runtime.lastError) {
                console.error('加载自定义配置失败:', chrome.runtime.lastError);
                showFeedback('加载自定义配置失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            customConfigs = result[CUSTOM_CONFIGS_KEY] || {};
            renderCustomConfigsList();
        });
    } catch (e) {
        console.error('加载自定义配置异常:', e);
        showFeedback('加载自定义配置异常: ' + e.message, 'error');
    }
}

// 加载域名配置
function loadDomains() {
    try {
        chrome.storage.local.get([DOMAINS_KEY], (result) => {
            if (chrome.runtime.lastError) {
                console.error('加载域名配置失败:', chrome.runtime.lastError);
                showFeedback('加载域名配置失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            currentDomains = result[DOMAINS_KEY] || [...DEFAULT_DOMAINS];
            renderDomainList();
        });
    } catch (e) {
        console.error('加载域名配置异常:', e);
        showFeedback('加载域名配置异常: ' + e.message, 'error');
    }
}

// 渲染域名列表
function renderDomainList() {
    // 清空列表
    domainListContainer.innerHTML = '';

    if (currentDomains.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'domain-item';
        emptyItem.textContent = '暂无添加的域名';
        emptyItem.style.display = 'block';
        domainListContainer.appendChild(emptyItem);
        return;
    }

    currentDomains.forEach((domain, index) => {
        const domainItem = document.createElement('div');
        domainItem.className = 'domain-item';
        domainItem.style.display = 'flex';
        domainItem.style.justifyContent = 'space-between';
        domainItem.style.alignItems = 'center';
        domainItem.style.padding = '8px';
        domainItem.style.marginBottom = '5px';
        domainItem.style.backgroundColor = '#f5f5f5';
        domainItem.style.borderRadius = '4px';

        // 域名文本
        const domainText = document.createElement('span');
        domainText.textContent = domain;
        domainText.style.overflow = 'hidden';
        domainText.style.textOverflow = 'ellipsis';
        domainText.style.marginRight = '10px';

        // 删除按钮
        const removeButton = document.createElement('button');
        removeButton.className = 'delete-btn';
        removeButton.textContent = '删除';
        removeButton.style.padding = '4px 8px';
        removeButton.style.fontSize = '12px';

        // 删除域名
        removeButton.addEventListener('click', () => {
            removeDomain(index);
        });

        domainItem.appendChild(domainText);
        domainItem.appendChild(removeButton);
        domainListContainer.appendChild(domainItem);
    });
}

// 添加域名
function addDomain() {
    if (!newDomainInput) return;
    
    const domain = newDomainInput.value.trim();
    if (!domain) {
        showFeedback('请输入有效的域名', 'info');
        return;
    }

    // 避免重复添加
    if (currentDomains.includes(domain)) {
        showFeedback('该域名已存在', 'info');
        return;
    }

    currentDomains.push(domain);
    // 立即更新UI
    renderDomainList();
    newDomainInput.value = '';
    // 保存到storage
    saveDomains();
}

// 删除域名
function removeDomain(index) {
    currentDomains.splice(index, 1);
    // 更新UI
    renderDomainList();
    // 保存到storage
    saveDomains();
}

// 保存域名配置
function saveDomains() {
    try {
        chrome.storage.local.set({ [DOMAINS_KEY]: currentDomains }, () => {
            if (chrome.runtime.lastError) {
                console.error('保存域名配置失败:', chrome.runtime.lastError);
                showFeedback('保存域名配置失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            showFeedback('域名配置已保存', 'success');
        });
    } catch (e) {
        console.error('保存域名配置异常:', e);
        showFeedback('保存域名配置异常: ' + e.message, 'error');
    }
}

// 更新设置UI
function updateSettingsUI() {
    defaultConfigNameInput.value = currentSettings.defaultConfigName || DEFAULT_SETTINGS.defaultConfigName;
}

// 渲染自定义配置列表
function renderCustomConfigsList() {
    // 清空列表
    customConfigsList.innerHTML = '';

    if (Object.keys(customConfigs).length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = '暂无自定义配置';
        customConfigsList.appendChild(emptyItem);
        return;
    }

    // 渲染每个自定义配置
    Object.keys(customConfigs).forEach(configName => {
        const listItem = document.createElement('li');

        const configNameSpan = document.createElement('span');
        configNameSpan.textContent = configName;

        const buttonContainer = document.createElement('div');

        const editButton = document.createElement('button');
        editButton.className = 'btn';
        editButton.textContent = '编辑';
        editButton.addEventListener('click', () => editCustomConfig(configName));

        const cloneButton = document.createElement('button');
        cloneButton.className = 'btn';
        cloneButton.textContent = '克隆';
        cloneButton.addEventListener('click', () => cloneCustomConfig(configName));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn delete-btn';
        deleteButton.textContent = '删除';
        deleteButton.addEventListener('click', () => deleteCustomConfig(configName));

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(cloneButton);
        buttonContainer.appendChild(deleteButton);

        listItem.appendChild(configNameSpan);
        listItem.appendChild(buttonContainer);

        customConfigsList.appendChild(listItem);
    });
}

// 保存设置
function saveSettings() {
    try {
        // 获取表单值
        const defaultConfigName = defaultConfigNameInput.value.trim() || DEFAULT_SETTINGS.defaultConfigName;

        // 更新当前设置
        currentSettings = {
            defaultConfigName
        };

        // 保存到存储
        chrome.storage.local.set({ [SETTINGS_KEY]: currentSettings }, () => {
            if (chrome.runtime.lastError) {
                console.error('保存设置失败:', chrome.runtime.lastError);
                showFeedback('保存设置失败: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            showFeedback('设置已保存', 'success');
        });
    } catch (e) {
        console.error('保存设置异常:', e);
        showFeedback('保存设置异常: ' + e.message, 'error');
    }
}

// 重置设置
function resetSettings() {
    if (confirm('确定要重置所有设置吗？')) {
        try {
            // 恢复默认设置
            currentSettings = { ...DEFAULT_SETTINGS };

            // 保存到存储
            chrome.storage.local.set({ [SETTINGS_KEY]: currentSettings }, () => {
                if (chrome.runtime.lastError) {
                    console.error('重置设置失败:', chrome.runtime.lastError);
                    showFeedback('重置设置失败: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }

                // 更新UI
                updateSettingsUI();
                showFeedback('设置已重置为默认值', 'success');
            });
        } catch (e) {
            console.error('重置设置异常:', e);
            showFeedback('重置设置异常: ' + e.message, 'error');
        }
    }
}

// 编辑自定义配置
function editCustomConfig(configName) {
    const newConfigName = prompt('编辑配置名称', configName);
    if (newConfigName !== null && newConfigName.trim() !== '') {
        if (newConfigName !== configName) {
            try {
                // 检查名称是否已存在
                if (customConfigs.hasOwnProperty(newConfigName)) {
                    showFeedback('配置名称已存在，请选择其他名称', 'error');
                    return;
                }

                // 重命名配置
                customConfigs[newConfigName] = customConfigs[configName];
                delete customConfigs[configName];
                // 保存到存储
                chrome.storage.local.set({ [CUSTOM_CONFIGS_KEY]: customConfigs }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('重命名配置失败:', chrome.runtime.lastError);
                        showFeedback('重命名配置失败: ' + chrome.runtime.lastError.message, 'error');
                        // 恢复原始配置
                        customConfigs[configName] = customConfigs[newConfigName];
                        delete customConfigs[newConfigName];
                        return;
                    }

                    // 重新渲染列表
                    renderCustomConfigsList();
                    showFeedback('配置已重命名', 'success');
                });
            } catch (e) {
                console.error('重命名配置异常:', e);
                showFeedback('重命名配置异常: ' + e.message, 'error');
            }
        }
        // 跳转到主界面
        window.location.href = 'index.html';
    }
}

// 克隆自定义配置
function cloneCustomConfig(configName) {
    const newConfigName = prompt('输入新配置名称', `${configName}_copy`);
    if (newConfigName !== null && newConfigName.trim() !== '') {
        try {
            // 检查名称是否已存在
            if (customConfigs.hasOwnProperty(newConfigName)) {
                showFeedback('配置名称已存在，请选择其他名称', 'error');
                return;
            }

            // 克隆配置
            customConfigs[newConfigName] = JSON.parse(JSON.stringify(customConfigs[configName]));
            // 保存到存储
            chrome.storage.local.set({ [CUSTOM_CONFIGS_KEY]: customConfigs }, () => {
                if (chrome.runtime.lastError) {
                    console.error('克隆配置失败:', chrome.runtime.lastError);
                    showFeedback('克隆配置失败: ' + chrome.runtime.lastError.message, 'error');
                    // 删除新增的配置
                    delete customConfigs[newConfigName];
                    return;
                }

                // 重新渲染列表
                renderCustomConfigsList();
                showFeedback('配置已克隆', 'success');
            });
        } catch (e) {
            console.error('克隆配置异常:', e);
            showFeedback('克隆配置异常: ' + e.message, 'error');
        }
    }
}

// 删除自定义配置
function deleteCustomConfig(configName) {
    if (confirm(`确定要删除配置 '${configName}' 吗？`)) {
        try {
            // 检查是否为默认配置
            if (configName === currentSettings.defaultConfigName) {
                showFeedback('不能删除默认配置', 'error');
                return;
            }

            // 删除配置
            delete customConfigs[configName];
            // 保存到存储
            chrome.storage.local.set({ [CUSTOM_CONFIGS_KEY]: customConfigs }, () => {
                if (chrome.runtime.lastError) {
                    console.error('删除配置失败:', chrome.runtime.lastError);
                    showFeedback('删除配置失败: ' + chrome.runtime.lastError.message, 'error');
                    // 恢复删除的配置
                    customConfigs[configName] = {}; // 这里应该是恢复之前的值，但我们没有备份
                    return;
                }

                // 重新渲染列表
                renderCustomConfigsList();
                showFeedback('配置已删除', 'success');
            });
        } catch (e) {
            console.error('删除配置异常:', e);
            showFeedback('删除配置异常: ' + e.message, 'error');
        }
    }
}

// 导入配置
function importConfig() {
    try {
        // 创建文件输入元素
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedConfigs = JSON.parse(event.target.result);

                    // 验证导入的数据格式
                    if (typeof importedConfigs !== 'object' || importedConfigs === null) {
                        showFeedback('导入的配置格式无效', 'error');
                        return;
                    }

                    // 合并配置
                    Object.assign(customConfigs, importedConfigs);

                    // 保存到存储
                    chrome.storage.local.set({ [CUSTOM_CONFIGS_KEY]: customConfigs }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('导入配置失败:', chrome.runtime.lastError);
                            showFeedback('导入配置失败: ' + chrome.runtime.lastError.message, 'error');
                            return;
                        }

                        // 重新渲染列表
                        renderCustomConfigsList();
                        showFeedback('配置已导入', 'success');
                    });
                } catch (error) {
                    console.error('解析导入的配置失败:', error);
                    showFeedback('解析导入的配置失败: ' + error.message, 'error');
                }
            };

            reader.readAsText(file);
        };

        fileInput.click();
    } catch (e) {
        console.error('导入配置异常:', e);
        showFeedback('导入配置异常: ' + e.message, 'error');
    }
}

// 导出配置
function exportConfig() {
    try {
        // 将配置转换为JSON字符串
        const configStr = JSON.stringify(customConfigs, null, 2);

        // 创建Blob对象
        const blob = new Blob([configStr], { type: 'application/json' });

        // 创建URL
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = `env_configs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();

        // 释放URL
        URL.revokeObjectURL(url);

        showFeedback('配置已导出', 'success');
    } catch (e) {
        console.error('导出配置异常:', e);
        showFeedback('导出配置异常: ' + e.message, 'error');
    }
}