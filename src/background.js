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
console.log(`侧边栏初始状态: 关闭`);

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-matechat') {
    console.log(`快捷键Ctrl+M被触发，当前侧边栏状态: ${isSidePanelOpen ? '打开' : '关闭'}`);
    
    if (!checkChromeVersion()) {
      alert('侧边栏功能需要Chrome 114或更高版本');
      return;
    }
    
    // 直接切换侧边栏状态
    if (isSidePanelOpen) {
      // 发送消息到侧边栏页面让其关闭
      try {
        chrome.runtime.sendMessage({ action: 'closeSidePanel' });
        console.log('已请求关闭侧边栏');
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
              console.log('侧边栏已打开');
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
  console.log('DevUI Dev Helper扩展已安装');
});

// 监听来自侧边栏页面的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sidebarClosed') {
    isSidePanelOpen = false;
    console.log('侧边栏已关闭');
  } else if (message.action === 'sidebarOpened') {
    isSidePanelOpen = true;
    console.log('侧边栏已打开');
  }
});

// 尝试监听侧边栏事件（如果API支持）
if (chrome.sidePanel) {
  if (chrome.sidePanel.onClose) {
    chrome.sidePanel.onClose.addListener(() => {
      isSidePanelOpen = false;
      console.log('侧边栏已关闭');
    });
  }
  if (chrome.sidePanel.onOpen) {
    chrome.sidePanel.onOpen.addListener(() => {
      isSidePanelOpen = true;
      console.log('侧边栏已打开');
    });
  }
}
