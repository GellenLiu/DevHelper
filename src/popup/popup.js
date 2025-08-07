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

    // 获取installedFeatures并渲染列表
    chrome.storage.local.get('installedFeatures', (result) => {
        const installedFeatures = result.installedFeatures || features.map(f => f.id);
        renderFeatureList(featureList, installedFeatures);
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
        if (message.action === 'featuresUpdated' || message.action === 'refreshFeatures') {
            // 重新加载功能配置
            loadFeatures().then(newFeatures => {
                features = newFeatures;
                chrome.storage.local.get('installedFeatures', (result) => {
                    const installedFeatures = result.installedFeatures || features.map(f => f.id);
                    renderFeatureList(featureList, installedFeatures);
                });
            });
        }
    });
});

// 渲染功能列表
function renderFeatureList(container, installedFeatures) {
    container.innerHTML = '';

    // 加载所有功能的配置状态
        const storageKeys = features.map(f => f.storageKey);
        chrome.storage.local.get(storageKeys, (results) => {
            const filteredFeatures = features.filter(f => installedFeatures.includes(f.id));
            filteredFeatures.forEach(feature => {
            // 创建列表项
            const listItem = document.createElement('li');
            listItem.className = 'feature-item';

            const listItemLeft = document.createElement('div');
            listItemLeft.className = 'feature-item-left';

            // 创建图标容器
            const iconContainer = document.createElement('div');
            iconContainer.className = 'feature-icon-container';

            // 生成图标
            if (feature.icon) {
                // 如果有图标配置，使用图标
                const iconUrl = chrome.runtime.getURL(feature.icon);
                const iconImg = document.createElement('img');
                iconImg.src = iconUrl;
                iconImg.className = 'feature-icon';
                iconImg.alt = feature.name + ' icon';
                iconContainer.appendChild(iconImg);
            } else {
                // 如果没有图标配置，使用首字母作为字母图标
                const firstLetter = feature.name.charAt(0).toUpperCase();
                // 生成随机背景色
                const bgColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
                const letterIcon = document.createElement('div');
                letterIcon.className = 'letter-icon';
                letterIcon.style.backgroundColor = bgColor;
                letterIcon.textContent = firstLetter;
                iconContainer.appendChild(letterIcon);
            }

            // 功能名称
            const nameSpan = document.createElement('span');
            nameSpan.className = 'feature-name';
            nameSpan.textContent = feature.name;

            // 组装列表项
            listItem.appendChild(listItemLeft);
            listItemLeft.appendChild(iconContainer);
            listItemLeft.appendChild(nameSpan);

            // 根据toggle字段决定是否显示开关
            if (feature.toggle !== false) {
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
                listItem.appendChild(toggleContainer);
            }

            // 点击列表项处理
            listItem.addEventListener('click', (e) => {
                // 防止点击开关时触发页面切换
                if (e.target.tagName !== 'INPUT' && e.target.className !== 'toggle-slider') {
                    // 对于matechat功能，打开sidePanel而不是设置页面
                    if (feature.id === 'matechat') {
                        // 获取当前活动标签页ID
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs.length > 0) {
                                const tabId = tabs[0].id;
                                // 打开sidePanel
                                chrome.sidePanel.open({ tabId: tabId });
                            }
                        });
                    } else {
                        // 其他功能保持原有行为
                        showSettingsPage(feature);
                    }
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

    // 清理旧的内容和事件监听器
    while (settingsContent.firstChild) {
        settingsContent.removeChild(settingsContent.firstChild);
    }

    // 应用宽度设置
    if (feature.width) {
        document.body.style.width = `${feature.width}px`;
    }

    // 应用header显示设置
    const header = document.querySelector('.header');
    if (header) {
        if (feature.showHeader !== undefined) {
            header.style.display = feature.showHeader ? 'block' : 'none';
        }
    }

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL(feature.settingsUrl);
    iframe.style.width = '100%';
    iframe.style.height = feature.height ? `${feature.height}px` : '100%';
    iframe.style.border = 'none';
    settingsContent.appendChild(iframe);

    // 切换页面显示
    menuPage.classList.remove('active');
    settingsPage.classList.add('active');
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