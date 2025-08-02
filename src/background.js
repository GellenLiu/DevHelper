// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-matechat') {
    console.log('快捷键Ctrl+M被触发，正在打开MateChat页面...');
    
    // 打开MateChat页面
    // 获取当前活动标签页的ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        // 使用tabId打开侧边栏
        chrome.sidePanel.open({ tabId: tabId });
      }
    });
  }
});

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('DevUI Dev Helper扩展已安装');
});