import loadFeatures from '../../feature.config.js';

// DOM元素
const featureGrid = document.getElementById('featureGrid');
const searchInput = document.getElementById('searchInput');
const categoryBtns = document.querySelectorAll('.category-btn');
let features = []; // 存储加载的功能配置
let installedFeatures = []; // 存储已安装的功能
let currentCategory = 'all'; // 当前分类
let searchQuery = ''; // 当前搜索关键词

// 分类名称映射
const categoryNames = {
    'all': '全部功能',
    'development': '开发工具',
    'monitoring': '监控工具',
    'utility': '实用工具',
    'testing': '测试工具'
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 异步加载功能配置
    features = await loadFeatures();

    // 加载已安装的功能配置
    chrome.storage.local.get('installedFeatures', (result) => {
        installedFeatures = result.installedFeatures || features.map(f => f.id);
        renderFeatureGrid();
    });

    // 添加搜索事件监听
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderFeatureGrid();
    });

    // 添加分类筛选事件监听
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有按钮的active类
            categoryBtns.forEach(b => b.classList.remove('active'));
            // 给当前按钮添加active类
            btn.classList.add('active');
            // 更新当前分类
            currentCategory = btn.dataset.category;
            // 重新渲染功能网格
            renderFeatureGrid();
        });
    });
});

// 渲染功能网格
function renderFeatureGrid() {
    featureGrid.innerHTML = '';

    // 筛选功能
        const filteredFeatures = features.filter(feature => {
            // 检查分类 - 确保feature和feature.category存在
            const hasCategory = feature && feature.category;
            const categoryMatch = currentCategory === 'all' || (hasCategory && feature.category === currentCategory);
            // 检查搜索
            const searchMatch = !searchQuery || 
                (feature.name && feature.name.toLowerCase().includes(searchQuery)) || 
                (feature.description && feature.description.toLowerCase().includes(searchQuery));
            return categoryMatch && searchMatch;
        });

    // 如果没有匹配的功能，显示空状态
    if (filteredFeatures.length === 0) {
        featureGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>没有找到匹配的功能</h3>
                <p>请尝试使用其他关键词或分类</p>
            </div>
        `;
        return;
    }

    // 渲染筛选后的功能
    filteredFeatures.forEach(feature => {
        const isInstalled = installedFeatures.includes(feature.id);
        // 从功能配置中获取分类，如果没有则使用默认值
        const category = feature.category || 'utility';
        const categoryName = categoryNames[category] || categoryNames['utility'];
        const version = feature.version || '1.0.0';
        // 使用从manifest中获取的描述
        const description = feature.description || '暂无描述';

        const card = document.createElement('div');
        card.className = 'feature-card';
        
        // 生成图标HTML
        let iconHtml = '';
        if (feature.icon) {
            // 如果有图标配置，使用图标
            // 使用chrome.runtime.getURL获取正确的图标路径
            const iconUrl = chrome.runtime.getURL(feature.icon);
            iconHtml = `<img src="${iconUrl}" class="feature-icon" alt="${feature.name} icon">`;
        } else {
            // 如果没有图标配置，使用首字母作为字母图标
            const firstLetter = feature.name.charAt(0).toUpperCase();
            // 生成随机背景色
            const bgColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
            iconHtml = `<div class="letter-icon" style="background-color: ${bgColor}">${firstLetter}</div>`;
        }
        
        card.innerHTML = `
            <div class="feature-header">
                <div class="feature-icon-container">
                    ${iconHtml}
                </div>
                <div class="feature-title-container">
                    <h3 class="feature-title">${feature.name}</h3>
                    <span class="feature-category">${categoryName}</span>
                </div>
            </div>
            <div class="feature-body">
                <p class="feature-description">${description}</p>
                <div class="feature-meta">
                    <span>版本: ${version}</span>
                    <span>更新于: ${feature.createdAt || '未知'}</span>
                </div>
                <div class="feature-actions">
                    ${isInstalled ? `
                    <button class="action-btn uninstall-btn" data-id="${feature.id}">
                        <i class="fas fa-trash-alt"></i> 卸载
                    </button>
                    <button class="action-btn settings-btn" data-id="${feature.id}" data-url="${feature.settingsUrl || '#'}">
                        <i class="fas fa-cog"></i> 设置
                    </button>
                    ` : `
                    <button class="action-btn install-btn" data-id="${feature.id}">
                        <i class="fas fa-download"></i> 安装
                    </button>
                    `}
                </div>
            </div>
        `;
        featureGrid.appendChild(card);
    });

    // 添加按钮事件监听
    addButtonEventListeners();
}

// 添加按钮事件监听
function addButtonEventListeners() {
    // 安装按钮事件
    document.querySelectorAll('.install-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const featureId = e.currentTarget.dataset.id;
            installFeature(featureId);
        });
    });

    // 卸载按钮事件
    document.querySelectorAll('.uninstall-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const featureId = e.currentTarget.dataset.id;
            uninstallFeature(featureId);
        });
    });

    // 设置按钮事件
    document.querySelectorAll('.settings-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const settingsUrl = e.currentTarget.dataset.url;
            if (settingsUrl && settingsUrl !== '#') {
                // 在新标签页打开设置页面
                chrome.tabs.create({ url: chrome.runtime.getURL(settingsUrl) });
            }
        });
    });
}

// 安装功能
function installFeature(featureId) {
    if (!installedFeatures.includes(featureId)) {
        installedFeatures.push(featureId);
        saveInstalledFeatures();

        // 通知其他页面功能已更新
        chrome.runtime.sendMessage({ action: 'featuresUpdated' });
    }
}

// 卸载功能
function uninstallFeature(featureId) {
    installedFeatures = installedFeatures.filter(id => id !== featureId);
    saveInstalledFeatures();

    // 通知其他页面功能已更新
    chrome.runtime.sendMessage({ action: 'featuresUpdated' });
}

// 保存已安装的功能
function saveInstalledFeatures() {
    chrome.storage.local.set({ installedFeatures }, () => {
        // 重新渲染功能网格
        renderFeatureGrid();

        // 显示操作成功提示
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = '#00b42a';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        notification.style.zIndex = '1000';
        notification.textContent = '操作成功!';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    });
}