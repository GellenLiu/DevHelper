/**
 * storage-manager.js - 统一存储管理，使用 chrome.storage.local
 * 提供 Promise 基础的 API
 */

class StorageManager {
  /**
   * 设置存储值
   * @param {string} key
   * @param {*} value
   * @returns {Promise<void>}
   */
  static async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 获取存储值
   * @param {string} key
   * @param {*} defaultValue
   * @returns {Promise<*>}
   */
  static async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] !== undefined ? result[key] : defaultValue);
      });
    });
  }

  /**
   * 删除存储值
   * @param {string} key
   * @returns {Promise<void>}
   */
  static async remove(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 清空所有存储
   * @returns {Promise<void>}
   */
  static async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 批量设置
   * @param {Object} obj
   * @returns {Promise<void>}
   */
  static async setMultiple(obj) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(obj, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 获取所有存储
   * @returns {Promise<Object>}
   */
  static async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result || {});
      });
    });
  }

  /**
   * 获取多个键的值
   * @param {Array<string>} keys
   * @returns {Promise<Object>}
   */
  static async getMultiple(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result || {});
      });
    });
  }
}

// 导出用于在 background script 中使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
