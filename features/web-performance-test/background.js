// background.js

// 存储popup的显示状态
let isPopupOpen = false;
// 存储当前打开的popup窗口ID
let popupWindowId = null;

// 图标点击事件处理
chrome.action.onClicked.addListener((tab) => {
  if (isPopupOpen && popupWindowId) {
    // 如果popup已经打开，关闭它
    chrome.windows.remove(popupWindowId, () => {
      isPopupOpen = false;
      popupWindowId = null;
    });
  } else {
    // 如果popup未打开，创建它
    createCustomPopup();
  }
});

// 创建自定义popup窗口
function createCustomPopup() {
  // 获取当前活动标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    
    // 获取当前标签页的窗口位置和尺寸，用于定位popup
    chrome.windows.get(activeTab.windowId, (window) => {
      // 设置popup窗口的位置和尺寸
      const width = 300;
      const height = 400;
      const left = window.left + window.width - width - 20;
      const top = window.top + 100;
      
      // 创建自定义popup窗口
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: width,
        height: height,
        left: Math.max(0, left),
        top: Math.max(0, top),
        focused: true,
        setSelfAsOpener: true
      }, (window) => {
        // 存储popup窗口ID和状态
        popupWindowId = window.id;
        isPopupOpen = true;
        
        // 监听窗口关闭事件
        chrome.windows.onRemoved.addListener(function removeListener(removedWindowId) {
          if (removedWindowId === window.id) {
            isPopupOpen = false;
            popupWindowId = null;
            // 移除监听器，避免内存泄漏
            chrome.windows.onRemoved.removeListener(removeListener);
          }
        });
      });
    });
  });
}
