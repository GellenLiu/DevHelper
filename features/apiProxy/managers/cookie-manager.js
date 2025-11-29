/**
 * cookie-manager.js - Cookie 管理器
 * 支持自动获取和手动配置 Cookie
 */

class CookieManager {
  constructor() {
    this.manualCookiesKey = 'manualCookies';
    this.autoCookiesKey = 'autoCookies';
  }

  /**
   * 获取指定 URL 的 Cookies
   * @param {string} url - URL
   * @returns {Promise<Object>} 包含所有 Cookies 的对象
   */
  async getUrlCookies(url) {
    try {
      const cookies = await chrome.cookies.getAll({ url: url });
      const result = {};
      cookies.forEach(cookie => {
        result[cookie.name] = cookie.value;
      });
      return result;
    } catch (error) {
      return {};
    }
  }

  /**
   * 获取某个规则的所有 Cookies（手动 + 自动）
   * @param {number} ruleId - 规则 ID
   * @param {string} targetUrl - 目标 URL（用于自动获取）
   * @param {Object} rule - 规则对象（可选）
   * @returns {Promise<Object>} 合并后的 Cookies
   */
  async getCookiesForRule(ruleId, targetUrl, rule = null) {
    // 获取手动配置的 Cookies
    const manualCookies = await this._getManualCookies(ruleId);

    // 判断是否启用自动收集cookie
    const isAutoEnabled = rule?.cookies?.auto !== false;

    // 获取自动 Cookies
    let autoCookies = {};
    if (isAutoEnabled) {
      try {
        autoCookies = await this.getUrlCookies(targetUrl);
        // 缓存自动获取的 Cookies
        await this._saveAutoCookies(ruleId, autoCookies);
      } catch (error) {
        console.error('Failed to get auto cookies:', error);
        // 尝试从缓存获取
        autoCookies = await this._getAutoCookies(ruleId);
      }
    }

    // 如果启用自动收集，则融合自动和手动cookie，手动cookie优先级更高
    // 如果禁用自动收集，则只使用手动cookie
    const merged = isAutoEnabled ? { ...autoCookies, ...manualCookies } : manualCookies;
    return merged;
  }

  /**
   * 添加手动 Cookie
   * @param {number} ruleId - 规则 ID
   * @param {string} name - Cookie 名称
   * @param {string} value - Cookie 值
   * @param {Object} options - 其他选项
   */
  async addManualCookie(ruleId, name, value, options = {}) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const cookies = manualCookies[this.manualCookiesKey] || {};

    if (!cookies[ruleId]) {
      cookies[ruleId] = {};
    }

    cookies[ruleId][name] = {
      value: value,
      domain: options.domain || '',
      path: options.path || '/',
      secure: options.secure || false,
      httpOnly: options.httpOnly || false,
      sameSite: options.sameSite || 'Lax'
    };

    await chrome.storage.local.set({ [this.manualCookiesKey]: cookies });
  }

  /**
   * 删除手动 Cookie
   * @param {number} ruleId - 规则 ID
   * @param {string} name - Cookie 名称
   */
  async deleteManualCookie(ruleId, name) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const cookies = manualCookies[this.manualCookiesKey] || {};

    if (cookies[ruleId]) {
      delete cookies[ruleId][name];
    }

    await chrome.storage.local.set({ [this.manualCookiesKey]: cookies });
  }

  /**
   * 获取某个规则的所有手动 Cookies
   * @param {number} ruleId - 规则 ID
   * @returns {Promise<Object>}
   */
  async _getManualCookies(ruleId) {
    const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
    const cookies = manualCookies[this.manualCookiesKey] || {};
    const ruleCookies = cookies[ruleId] || {};

    // 提取 value 值
    const result = {};
    Object.entries(ruleCookies).forEach(([name, cookie]) => {
      result[name] = cookie.value;
    });

    return result;
  }

  /**
   * 获取某个规则的所有自动 Cookies（缓存的）
   * @param {number} ruleId - 规则 ID
   * @returns {Promise<Object>}
   */
  async _getAutoCookies(ruleId) {
    const autoCookies = await chrome.storage.local.get(this.autoCookiesKey);
    const cookies = autoCookies[this.autoCookiesKey] || {};
    return cookies[ruleId] || {};
  }

  /**
   * 保存自动获取的 Cookies
   * @private
   */
  async _saveAutoCookies(ruleId, cookies) {
    const autoCookies = await chrome.storage.local.get(this.autoCookiesKey);
    const all = autoCookies[this.autoCookiesKey] || {};
    all[ruleId] = cookies;
    await chrome.storage.local.set({ [this.autoCookiesKey]: all });
  }

  /**
   * 构建 Cookie 字符串
   * @param {Object} cookies - Cookies 对象
   * @returns {string} "name1=value1; name2=value2" 格式
   */
  buildCookieHeader(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * 清除某个规则的缓存 Cookies
   * @param {number} ruleId - 规则 ID
   */
  async clearRuleCookieCache(ruleId) {
    const autoCookies = await chrome.storage.local.get(this.autoCookiesKey);
    const all = autoCookies[this.autoCookiesKey] || {};
    delete all[ruleId];
    await chrome.storage.local.set({ [this.autoCookiesKey]: all });
  }

  /**
   * 刷新某个规则的自动 Cookies
   * @param {number} ruleId - 规则 ID
   * @param {string} targetUrl - 目标 URL
   */
  async refreshAutoCookies(ruleId, targetUrl) {
    try {
      const cookies = await this.getUrlCookies(targetUrl);
      await this._saveAutoCookies(ruleId, cookies);
      return cookies;
    } catch (error) {
      console.error('Failed to refresh cookies:', error);
      throw error;
    }
  }

  /**
   * 批量刷新所有规则的 Cookies
   * @param {Array<Object>} rules - 规则数组，每个规则应包含 id 和 targetUrl
   */
  async refreshAllCookies(rules) {
    const promises = rules.map(rule =>
      this.refreshAutoCookies(rule.id, rule.targetUrl).catch(err => {
        console.error(`Failed to refresh cookies for rule ${rule.id}:`, err);
      })
    );
    await Promise.all(promises);
  }

  /**
   * 导出规则的 Cookies
   * @param {number} ruleId - 规则 ID
   */
  async exportCookies(ruleId) {
    const manual = await this._getManualCookies(ruleId);
    const auto = await this._getAutoCookies(ruleId);
    return JSON.stringify({ manual, auto }, null, 2);
  }

  /**
   * 从导出数据导入 Cookies
   * @param {number} ruleId - 规则 ID
   * @param {string} jsonString - JSON 字符串
   */
  async importCookies(ruleId, jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const manualCookies = await chrome.storage.local.get(this.manualCookiesKey);
      const all = manualCookies[this.manualCookiesKey] || {};

      if (!all[ruleId]) {
        all[ruleId] = {};
      }

      if (data.manual) {
        Object.entries(data.manual).forEach(([name, value]) => {
          all[ruleId][name] = { value, domain: '', path: '/', secure: false, httpOnly: false, sameSite: 'Lax' };
        });
      }

      await chrome.storage.local.set({ [this.manualCookiesKey]: all });
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * 获取规则的 Cookie 统计信息
   */
  async getCookieStats(ruleId, targetUrl) {
    const manual = await this._getManualCookies(ruleId);
    const auto = await this._getAutoCookies(ruleId);

    return {
      manualCount: Object.keys(manual).length,
      autoCount: Object.keys(auto).length,
      totalCount: Object.keys(manual).length + Object.keys(auto).length,
      manualCookies: manual,
      autoCookies: auto
    };
  }
}

// 导出以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CookieManager;
}
