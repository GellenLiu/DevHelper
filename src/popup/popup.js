import loadFeatures from '../../feature.config.js';

// DOM元素
let menuPage, settingsPage, settingsContent, backButton;
let features = []; // 存储加载的功能配置

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    menuPage = document.getElementById('menuPage');
    settingsPage = document.getElementById('settingsPage');
    settingsContent = document.getElementById('settingsContent');
    backButton = document.getElementById('backButton');
    const featureList = document.getElementById('featureList');

    // 异步加载功能配置
    features = await loadFeatures();

    // 获取displayedFeatures并渲染列表
    chrome.storage.local.get('displayedFeatures', (result) => {
        const displayedFeatures = result.displayedFeatures || features.map(f => f.id);
        renderFeatureList(featureList, displayedFeatures);
    });

    // 返回按钮事件
    backButton.addEventListener('click', () => {
        showMenuPage();
    });

    // 功能管理按钮事件
    document.getElementById('manageFeaturesBtn').addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/management/feature-management.html')
        });
    });

    // 添加消息监听器以刷新功能列表
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'refreshFeatures') {
            // 重新加载功能配置
            loadFeatures().then(newFeatures => {
                features = newFeatures;
                chrome.storage.local.get('displayedFeatures', (result) => {
                    const displayedFeatures = result.displayedFeatures || features.map(f => f.id);
                    renderFeatureList(featureList, displayedFeatures);
                });
            });
        }
    });
});

// 渲染功能列表
function renderFeatureList(container, displayedFeatures) {
    container.innerHTML = '';

    // 加载所有功能的配置状态
    const storageKeys = features.map(f => f.storageKey);
    chrome.storage.local.get(storageKeys, (results) => {
        const filteredFeatures = features.filter(f => displayedFeatures.includes(f.id));
        filteredFeatures.forEach(feature => {
            // 创建列表项
            const listItem = document.createElement('li');
            listItem.className = 'feature-item';

            // 功能名称
            const nameSpan = document.createElement('span');
            nameSpan.className = 'feature-name';
            nameSpan.textContent = feature.name;

            // 开关
            const toggleContainer = document.createElement('label');
            toggleContainer.className = 'toggle-switch';

            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.checked = results[feature.storageKey]?.enabled || false;

            // 保存开关状态变化
            toggleInput.addEventListener('change', () => {
                const config = results[feature.storageKey] || { enabled: false };
                config.enabled = toggleInput.checked;
                chrome.storage.local.set({
                    [feature.storageKey]: config
                });
            });

            const toggleSlider = document.createElement('span');
            toggleSlider.className = 'toggle-slider';

            toggleContainer.appendChild(toggleInput);
            toggleContainer.appendChild(toggleSlider);

            // 组装列表项
            listItem.appendChild(nameSpan);
            listItem.appendChild(toggleContainer);

            // 点击列表项进入设置页面
            listItem.addEventListener('click', (e) => {
                // 防止点击开关时触发页面切换
                if (e.target.tagName !== 'INPUT' && e.target.className !== 'toggle-slider') {
                    showSettingsPage(feature);
                }
            });

            container.appendChild(listItem);
        });
    });
}

// 显示菜单页面
function showMenuPage() {
    menuPage.classList.add('active');
    settingsPage.classList.remove('active');
    document.querySelector('.page-title').textContent = 'Settings';
    settingsContent.innerHTML = '';
}

// 显示设置页面
function showSettingsPage(feature) {
    // 更新标题
    document.querySelector('.page-title').textContent = feature.name;

    // 加载设置页面内容
    fetch(feature.settingsUrl)
        .then(response => response.text())
        .then(html => {
            // 插入设置内容
            settingsContent.innerHTML = html;

            // 执行页面中的脚本
            executeScriptsInContent(settingsContent);

            // 切换页面显示
            menuPage.classList.remove('active');
            settingsPage.classList.add('active');
        })
        .catch(error => {
            settingsContent.innerHTML = `<div class="error-message">Failed to load settings: ${error.message}</div>`;
            menuPage.classList.remove('active');
            settingsPage.classList.add('active');
        });
}

// 执行内容中的脚本
function executeScriptsInContent(container) {
    // 获取所有脚本标签
    const scriptTags = container.querySelectorAll('script');
    scriptTags.forEach(oldScript => {
        // 创建新脚本元素
        const newScript = document.createElement('script');
        
        // 复制属性
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });

        // 处理内联脚本
        if (oldScript.textContent) {
            newScript.textContent = oldScript.textContent;
        }

        // 替换原有脚本
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}