// 页面加载完成后通知background.js
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({ action: 'sidebarOpened' });
});

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'closeSidePanel') {
    // 关闭当前页面
    window.close();
    // 通知background.js侧边栏已关闭
    chrome.runtime.sendMessage({ action: 'sidebarClosed' });
  }
});

// 页面关闭前通知background.js
window.addEventListener('beforeunload', () => {
  chrome.runtime.sendMessage({ action: 'sidebarClosed' });
});