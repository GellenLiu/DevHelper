/**
 * 加载JSON文件的工具函数
 * @param {string} path - JSON文件路径
 * @returns {Promise<Object>} - 返回解析后的JSON对象
 */
async function loadJson(path) {
  try {
    const response = await fetch(chrome.runtime.getURL(path));
    if (!response.ok) {
      throw new Error(`Failed to load JSON file: ${path}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading JSON:', error);
    return null;
  }
}

export default loadJson;