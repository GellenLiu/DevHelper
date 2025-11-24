/**
 * logger.js - 日志管理器
 * 记录所有请求和响应，支持搜索、过滤、导出
 */

class Logger {
  constructor(maxLogs = 2000) {
    this.maxLogs = maxLogs;
    this.logs = [];
    this.requestLogsKey = 'requestLogs';
    this.responseLogsKey = 'responseLogs';
  }

  /**
   * 初始化日志管理器
   */
  async initialize() {
    const logs = await chrome.storage.local.get([this.requestLogsKey, this.responseLogsKey]);
    this.logs = {
      requests: logs[this.requestLogsKey] || [],
      responses: logs[this.responseLogsKey] || []
    };
  }

  /**
   * 添加请求日志
   * @param {Object} logData - 日志数据
   */
  async addRequestLog(logData) {
    const log = {
      id: Date.now() + Math.random(),
      type: 'request',
      timestamp: logData.timestamp || new Date().toISOString(),
      url: logData.url,
      method: logData.method || 'GET',
      headers: logData.headers || {},
      body: logData.body,
      ruleId: logData.ruleId,
      ruleName: logData.ruleName,
      targetUrl: logData.targetUrl,
      tabUrl: logData.tabUrl
    };

    this.logs.requests.unshift(log);

    // 限制日志数量
    if (this.logs.requests.length > this.maxLogs) {
      this.logs.requests = this.logs.requests.slice(0, this.maxLogs);
    }

    await this._saveRequests();
    return log;
  }

  /**
   * 添加响应日志
   * @param {Object} logData - 日志数据
   */
  async addResponseLog(logData) {
    const log = {
      id: Date.now() + Math.random(),
      type: 'response',
      timestamp: logData.timestamp || new Date().toISOString(),
      url: logData.url,
      status: logData.status,
      statusText: logData.statusText,
      body: logData.body,
      headers: logData.headers || {},
      ruleId: logData.ruleId,
      size: this._getSize(logData.body)
    };

    this.logs.responses.unshift(log);

    // 限制日志数量
    if (this.logs.responses.length > this.maxLogs) {
      this.logs.responses = this.logs.responses.slice(0, this.maxLogs);
    }

    await this._saveResponses();
    return log;
  }

  /**
   * 添加错误日志
   * @param {Object} logData - 日志数据
   */
  async addErrorLog(logData) {
    const log = {
      id: Date.now() + Math.random(),
      type: 'error',
      timestamp: logData.timestamp || new Date().toISOString(),
      url: logData.url,
      error: logData.error,
      ruleId: logData.ruleId
    };

    this.logs.requests.unshift(log);

    if (this.logs.requests.length > this.maxLogs) {
      this.logs.requests = this.logs.requests.slice(0, this.maxLogs);
    }

    await this._saveRequests();
    return log;
  }

  /**
   * 获取所有日志（合并请求和响应）
   */
  async getAllLogs() {
    const logs = await chrome.storage.local.get([this.requestLogsKey, this.responseLogsKey]);
    const requests = logs[this.requestLogsKey] || [];
    const responses = logs[this.responseLogsKey] || [];

    // 合并并按时间戳排序
    const all = [...requests, ...responses].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return all;
  }

  /**
   * 获取请求日志
   */
  async getRequestLogs(limit = 100) {
    const logs = await chrome.storage.local.get(this.requestLogsKey);
    const requests = logs[this.requestLogsKey] || [];
    return requests.slice(0, limit);
  }

  /**
   * 获取响应日志
   */
  async getResponseLogs(limit = 100) {
    const logs = await chrome.storage.local.get(this.responseLogsKey);
    const responses = logs[this.responseLogsKey] || [];
    return responses.slice(0, limit);
  }

  /**
   * 搜索日志
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项 { type, ruleId, startTime, endTime }
   */
  async searchLogs(keyword, options = {}) {
    const allLogs = await this.getAllLogs();

    return allLogs.filter(log => {
      // 类型过滤
      if (options.type && log.type !== options.type) {
        return false;
      }

      // 规则 ID 过滤
      if (options.ruleId && log.ruleId !== options.ruleId) {
        return false;
      }

      // 时间范围过滤
      if (options.startTime && new Date(log.timestamp) < new Date(options.startTime)) {
        return false;
      }
      if (options.endTime && new Date(log.timestamp) > new Date(options.endTime)) {
        return false;
      }

      // 关键词搜索
      if (keyword) {
        const keywordLower = keyword.toLowerCase();
        return (
          (log.url && log.url.toLowerCase().includes(keywordLower)) ||
          (log.error && log.error.toLowerCase().includes(keywordLower)) ||
          (log.ruleName && log.ruleName.toLowerCase().includes(keywordLower))
        );
      }

      return true;
    });
  }

  /**
   * 获取某个规则的所有日志
   * @param {number} ruleId - 规则 ID
   */
  async getRuleLogs(ruleId) {
    const allLogs = await this.getAllLogs();
    return allLogs.filter(log => log.ruleId === ruleId);
  }

  /**
   * 按时间范围获取日志
   */
  async getLogsByTimeRange(startTime, endTime) {
    const allLogs = await this.getAllLogs();
    const start = new Date(startTime);
    const end = new Date(endTime);

    return allLogs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= start && logTime <= end;
    });
  }

  /**
   * 清空所有日志
   */
  async clearAllLogs() {
    this.logs = { requests: [], responses: [] };
    await chrome.storage.local.remove(this.requestLogsKey);
    await chrome.storage.local.remove(this.responseLogsKey);
  }

  /**
   * 清空请求日志
   */
  async clearRequestLogs() {
    this.logs.requests = [];
    await this._saveRequests();
  }

  /**
   * 清空响应日志
   */
  async clearResponseLogs() {
    this.logs.responses = [];
    await this._saveResponses();
  }

  /**
   * 删除某个日志
   * @param {string|number} logId - 日志 ID
   */
  async deleteLog(logId) {
    this.logs.requests = this.logs.requests.filter(log => log.id !== logId);
    this.logs.responses = this.logs.responses.filter(log => log.id !== logId);
    await Promise.all([this._saveRequests(), this._saveResponses()]);
  }

  /**
   * 导出日志为 JSON
   * @param {Object} options - 导出选项 { type, ruleId, format }
   */
  async exportLogs(options = {}) {
    let logs = await this.getAllLogs();

    // 应用过滤
    if (options.type) {
      logs = logs.filter(log => log.type === options.type);
    }
    if (options.ruleId) {
      logs = logs.filter(log => log.ruleId === options.ruleId);
    }

    const format = options.format || 'json';

    if (format === 'csv') {
      return this._logsToCSV(logs);
    } else if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * 将日志转换为 CSV 格式
   * @private
   */
  _logsToCSV(logs) {
    const headers = ['时间戳', '类型', 'URL', '方法', '状态', '规则', '大小'];
    const rows = logs.map(log => [
      log.timestamp,
      log.type,
      log.url || '-',
      log.method || '-',
      log.status || '-',
      log.ruleName || '-',
      log.size || '-'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * 获取日志统计信息
   */
  async getStats() {
    const allLogs = await this.getAllLogs();
    const requests = allLogs.filter(log => log.type === 'request');
    const responses = allLogs.filter(log => log.type === 'response');
    const errors = allLogs.filter(log => log.type === 'error');

    // 按 URL 统计
    const urlStats = {};
    allLogs.forEach(log => {
      if (log.url) {
        urlStats[log.url] = (urlStats[log.url] || 0) + 1;
      }
    });

    // 按规则统计
    const ruleStats = {};
    allLogs.forEach(log => {
      if (log.ruleName) {
        ruleStats[log.ruleName] = (ruleStats[log.ruleName] || 0) + 1;
      }
    });

    return {
      total: allLogs.length,
      requests: requests.length,
      responses: responses.length,
      errors: errors.length,
      urlStats,
      ruleStats
    };
  }

  /**
   * 计算数据大小
   * @private
   */
  _getSize(data) {
    if (!data) return 0;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return (new Blob([str]).size / 1024).toFixed(2) + ' KB';
  }

  /**
   * 保存请求日志
   * @private
   */
  async _saveRequests() {
    await chrome.storage.local.set({ [this.requestLogsKey]: this.logs.requests });
  }

  /**
   * 保存响应日志
   * @private
   */
  async _saveResponses() {
    await chrome.storage.local.set({ [this.responseLogsKey]: this.logs.responses });
  }
}

// 导出以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}
