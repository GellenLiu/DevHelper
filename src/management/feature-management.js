import loadFeatures from '../../feature.config.js';

// DOM元素
const featureList = document.getElementById('featureManagementList');
const saveBtn = document.getElementById('saveFeaturesBtn');
let features = []; // 存储加载的功能配置

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 异步加载功能配置
    features = await loadFeatures();

    // 加载已保存的展示配置
    chrome.storage.local.get('displayedFeatures', (result) => {
        const displayedFeatures = result.displayedFeatures || features.map(f => f.id);
        renderFeatureManagementList(displayedFeatures);
    });
});

// 渲染功能管理列表
function renderFeatureManagementList(displayedFeatures) {
    featureList.innerHTML = '';

    features.forEach(feature => {
        const isChecked = displayedFeatures.includes(feature.id);
        const li = document.createElement('li');
        li.className = 'feature-item';
        li.innerHTML = `
            <label>
                <input type="checkbox" value="${feature.id}" ${isChecked ? 'checked' : ''}>
                <span class="feature-name">${feature.name}</span>
            </label>
        `;
        featureList.appendChild(li);
    });
}

// 保存功能展示配置
saveBtn.addEventListener('click', () => {
    const checkboxes = featureList.querySelectorAll('input[type="checkbox"]:checked');
    const displayedFeatures = Array.from(checkboxes).map(cb => cb.value);

    chrome.storage.local.set({ displayedFeatures }, () => {
        // 显示保存成功提示
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '保存成功!';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            // 通知其他页面配置已更新
            chrome.runtime.sendMessage({ action: 'featuresUpdated' });
        }, 1500);
    });
});