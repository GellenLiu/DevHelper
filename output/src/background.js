// 使用存储来跟踪侧边栏状态
let isSidePanelOpen = false;
const SIDEBAR_URL = 'features/matechat/index.html';

// 检查Chrome版本是否支持Side Panel API
function checkChromeVersion() {
  const version = /Chrome\/(\d+)/.exec(navigator.userAgent);
  if (version && parseInt(version[1]) >= 114) {
    return true;
  } else {
    console.warn('Side Panel API requires Chrome 114 or later');
    return false;
  }
}

// 初始化时假设侧边栏是关闭的

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-matechat') {
    
    if (!checkChromeVersion()) {
      alert('侧边栏功能需要Chrome 114或更高版本');
      return;
    }
    
    // 直接切换侧边栏状态
    if (isSidePanelOpen) {
      // 发送消息到侧边栏页面让其关闭
      try {
        chrome.runtime.sendMessage({ action: 'closeSidePanel' });
        isSidePanelOpen = false;
      } catch (error) {
        console.error('请求关闭侧边栏失败:', error);
      }
    } else {
      // 获取当前活动标签页并使用tabId打开侧边栏
        try {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              chrome.sidePanel.open({ tabId: tabs[0].id });
              isSidePanelOpen = true;
            }
          });
        } catch (error) {
          console.error('打开侧边栏失败:', error);
        }
    }
  }
});

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
});

// 监听来自侧边栏页面的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sidebarClosed') {
    isSidePanelOpen = false;
  } else if (message.action === 'sidebarOpened') {
    isSidePanelOpen = true;
  }
});

// 尝试监听侧边栏事件（如果API支持）
if (chrome.sidePanel) {
  if (chrome.sidePanel.onClose) {
    chrome.sidePanel.onClose.addListener(() => {
      isSidePanelOpen = false;
    });
  }
  if (chrome.sidePanel.onOpen) {
    chrome.sidePanel.onOpen.addListener(() => {
      isSidePanelOpen = true;
    });
  }
}
