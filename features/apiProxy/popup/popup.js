// popup.js - 插件弹出页面逻辑

class PopupManager {
    constructor() {
        this.pluginToggle = document.getElementById('plugin-toggle');
        this.rulesContainer = document.getElementById('rules-container');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        
        this.init();
    }

    async init() {
        // 初始化事件监听
        this.bindEvents();
        
        // 加载插件状态
        await this.loadPluginStatus();
        
        // 加载规则列表
        await this.loadRules();
    }

    bindEvents() {
        // 插件开关事件
        this.pluginToggle.addEventListener('change', (e) => {
            this.togglePlugin(e.target.checked);
        });

        // 全屏按钮事件
        this.fullscreenBtn.addEventListener('click', () => {
            this.openOptionsPage();
        });
    }

    async loadPluginStatus() {
        try {
            const settings = await chrome.storage.local.get('settings');
            this.pluginToggle.checked = settings.settings?.globalEnable !== false;
        } catch (error) {
            console.error('Failed to load plugin status:', error);
            this.pluginToggle.checked = true;
        }
    }

    async togglePlugin(enabled) {
        try {
            const currentSettings = await chrome.storage.local.get('settings');
            await chrome.storage.local.set({
                settings: {
                    ...currentSettings.settings,
                    globalEnable: enabled
                }
            });
            // 发送消息给background.js更新状态
            chrome.runtime.sendMessage({
                type: 'UPDATE_PLUGIN_STATUS',
                enabled
            });
        } catch (error) {
            console.error('Failed to toggle plugin:', error);
        }
    }

    async loadRules() {
        try {
            const rules = await this.sendMessageToBackground({ type: 'GET_RULES' });
            this.renderRules(rules.rules || []);
        } catch (error) {
            console.error('Failed to load rules:', error);
            this.renderRules([]);
        }
    }

    /**
     * 发送消息给background.js
     */
    sendMessageToBackground(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    renderRules(rules) {
        if (rules.length === 0) {
            this.rulesContainer.innerHTML = '<div class="no-rules">暂无规则</div>';
            return;
        }

        const rulesHtml = rules.map(rule => {
            return `
                <div class="rule-item" data-rule-id="${rule.id}">
                    <div class="rule-header">
                        <span class="rule-name">${rule.name || '未命名规则'}</span>
                        <div class="rule-toggle-container">
                            <label class="rule-toggle-switch">
                                <input type="checkbox" class="rule-toggle" data-rule-id="${rule.id}" ${rule.enabled ? 'checked' : ''}>
                                <span class="rule-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.rulesContainer.innerHTML = rulesHtml;
        
        // 绑定规则开关事件
        this.bindRuleToggleEvents();
    }

    bindRuleToggleEvents() {
        const ruleToggles = document.querySelectorAll('.rule-toggle');
        ruleToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const ruleId = parseInt(e.target.dataset.ruleId);
                const enabled = e.target.checked;
                this.toggleRule(ruleId, enabled);
            });
        });
    }

    async toggleRule(ruleId, enabled) {
        try {
            // 通过background.js更新规则状态
            await this.sendMessageToBackground({
                type: 'UPDATE_RULE',
                data: {
                    id: ruleId,
                    updates: { enabled }
                }
            });
            // 重新加载规则列表以更新UI
            await this.loadRules();
        } catch (error) {
            console.error('Failed to toggle rule:', error);
        }
    }

    openOptionsPage() {
        // 打开options页面
        chrome.runtime.openOptionsPage();
    }
}

// 初始化PopupManager
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});