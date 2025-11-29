/**
 * rule-manager.js - 转发规则管理器
 * 支持创建、编辑、删除、启用/禁用多个转发规则
 */

class RuleManager {
  constructor() {
    this.rules = [];
    this.storageKey = 'forwardingRules';
  }

  /**
   * 初始化，加载已保存的规则
   */
  async initialize() {
    const rules = await chrome.storage.local.get(this.storageKey);
    this.rules = rules[this.storageKey] || [];
    return this.rules;
  }

  /**
   * 获取所有规则
   */
  async getRules() {
    const rules = await chrome.storage.local.get(this.storageKey);
    this.rules = rules[this.storageKey] || [];
    return this.rules;
  }

  /**
   * 获取启用的规则
   */
  async getEnabledRules() {
    const rules = await this.getRules();
    return rules.filter(rule => rule.enabled);
  }

  /**
   * 根据 ID 获取规则
   */
  async getRule(id) {
    const rules = await this.getRules();
    return rules.find(rule => rule.id === id);
  }

  /**
   * 创建新规则
   * @param {Object} ruleData - 规则数据
   * @returns {Object} 创建的规则
   */
  async createRule(ruleData) {
    const rule = {
      id: Date.now(),
      name: ruleData.name || '新规则',
      sourcePattern: ruleData.sourcePattern || '',
      targetUrl: ruleData.targetUrl || '',
      enabled: true,
      method: ruleData.method || 'ALL',
      description: ruleData.description || '',
      cookies: {
        enabled: ruleData.cookies?.enabled !== false,
        auto: ruleData.cookies?.auto !== false,
        manual: ruleData.cookies?.manual || []
      },
      headers: ruleData.headers || {},
      responseModify: {
        enabled: false,
        rules: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.push(rule);
    await this._save();
    return rule;
  }

  /**
   * 更新规则
   * @param {number} id - 规则 ID
   * @param {Object} updates - 更新的数据
   */
  async updateRule(id, updates) {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) {
      throw new Error(`Rule with id ${id} not found`);
    }

    Object.assign(rule, updates, {
      updatedAt: new Date().toISOString()
    });

    await this._save();
    return rule;
  }

  /**
   * 删除规则
   * @param {number} id - 规则 ID
   */
  async deleteRule(id) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Rule with id ${id} not found`);
    }

    this.rules.splice(index, 1);
    await this._save();
  }

  /**
   * 启用规则
   * @param {number} id - 规则 ID
   */
  async enableRule(id) {
    return this.updateRule(id, { enabled: true });
  }

  /**
   * 禁用规则
   * @param {number} id - 规则 ID
   */
  async disableRule(id) {
    return this.updateRule(id, { enabled: false });
  }

  /**
   * 匹配 URL 是否符合规则
   * @param {string} url - 要检查的 URL
   * @param {string} method - 请求方法
   * @returns {Object|null} 匹配的规则或 null
   */
  matchRule(url, method = 'GET') {
    const urlLower = (url || '').toString().toLowerCase();
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // 检查方法
      if (rule.method !== 'ALL' && rule.method !== method.toUpperCase()) {
        continue;
      }

      // 使用前缀匹配（以 /.../ 包裹的仍作为正则表达式）
      const patternRaw = (rule.sourcePattern || '').toString().trim();
      if (!patternRaw) continue;

      try {
        if (patternRaw.startsWith('/') && patternRaw.endsWith('/')) {
          // 正则表达式
          const inner = patternRaw.slice(1, -1);
          const urlPattern = new RegExp(inner, 'i');
          if (urlPattern.test(url)) {
            return rule;
          }
        } else {
          // 前缀匹配（区分大小写? 使用忽略大小写比较）
          const prefix = patternRaw.toLowerCase();
          if (urlLower.startsWith(prefix)) {
            return rule;
          }
        }
      } catch (error) {
        console.error('Invalid regex pattern:', rule.sourcePattern, error);
      }
    }
    return null;
  }

  /**
   * 计算目标 URL
   * @param {string} sourceUrl - 源 URL
   * @param {Object} rule - 规则
   * @returns {string} 目标 URL
   */
  calculateTargetUrl(sourceUrl, rule) {
    try {
      const urlPattern = new RegExp(rule.sourcePattern, 'i');
      let targetUrl = sourceUrl.replace(urlPattern, rule.targetUrl);
      return targetUrl;
    } catch (error) {
      console.error('Error calculating target URL:', error);
      return sourceUrl;
    }
  }

  /**
   * 导出规则为 JSON
   */
  async exportRules() {
    return JSON.stringify(this.rules, null, 2);
  }

  /**
   * 从 JSON 导入规则
   * @param {string} jsonString - JSON 字符串
   */
  async importRules(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        throw new Error('Import data must be an array');
      }

      // 重新分配 ID 以避免冲突
      const newRules = imported.map(rule => ({
        ...rule,
        id: Date.now() + Math.random()
      }));

      this.rules = [...this.rules, ...newRules];
      await this._save();
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * 清空所有规则
   */
  async clearRules() {
    this.rules = [];
    await this._save();
  }

  /**
   * 保存规则到存储
   * @private
   */
  async _save() {
    await chrome.storage.local.set({ [this.storageKey]: this.rules });
  }

  /**
   * 复制规则
   * @param {number} id - 要复制的规则 ID
   */
  async duplicateRule(id) {
    const rule = await this.getRule(id);
    if (!rule) {
      throw new Error(`Rule with id ${id} not found`);
    }

    const newRule = {
      ...rule,
      id: Date.now(),
      name: `${rule.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.push(newRule);
    await this._save();
    return newRule;
  }

  /**
   * 批量更新规则状态
   * @param {Array<number>} ids - 规则 ID 数组
   * @param {boolean} enabled - 启用/禁用
   */
  async bulkUpdateStatus(ids, enabled) {
    for (const id of ids) {
      const rule = this.rules.find(r => r.id === id);
      if (rule) {
        rule.enabled = enabled;
      }
    }
    await this._save();
  }

  /**
   * 获取规则统计信息
   */
  getStats() {
    return {
      total: this.rules.length,
      enabled: this.rules.filter(r => r.enabled).length,
      disabled: this.rules.filter(r => !r.enabled).length
    };
  }
}

// 导出以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RuleManager;
}
