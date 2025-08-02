// 功能配置列表 - 使用json-loader异步加载
import loadJson from './utils/json-loader.js';

/**
 * 加载所有功能配置
 * @returns {Promise<Array>} - 返回功能配置数组
 */
async function loadFeatures() {
    try {
        // 定义功能模块配置，新增功能只需在此添加条目
        const featureModules = [
            { id: 'js-error-monitor', path: 'features/js-error-monitor/manifest.json' },
            { id: 'env-configurator', path: 'features/env-configurator/manifest.json' },
            { id: 'matechat', path: 'features/matechat/manifest.json' }
        ];

        // 并行加载所有功能模块的manifest.json文件
        const results = await Promise.all(
            featureModules.map(async module => {
                try {
                    const manifest = await loadJson(module.path);
                    if (!manifest) {
                        console.warn(`Manifest for feature ${module.id} is null`);
                        return null;
                    }
                    // 确保devui_feature存在
                    if (!manifest.devui_feature) {
                        console.warn(`devui_feature not found in manifest for feature ${module.id}`);
                        return null;
                    }
                    return {
                        ...manifest.devui_feature,
                        name: manifest.name,
                        id: module.id, // 确保每个功能有唯一ID
                        description: manifest.description // 从manifest中提取描述
                    };
                } catch (error) {
                    console.error(`Failed to load manifest for feature ${module.id}:`, error);
                    return null;
                }
            })
        );

        // 过滤掉可能为null的项
        return results.filter(Boolean);
    } catch (error) {
        console.error('Error loading features:', error);
        return [];
    }
}

export default loadFeatures;