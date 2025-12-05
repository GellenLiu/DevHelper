# 🚨前端监控黑科技：我用这3行代码提前发现了99%的生产环境JS错误

## 🔥 作为前端，你是否也被这些问题折磨过？

"用户说页面崩了，但我这里一切正常啊..."
"控制台没开，刚才那个报错一闪而过，没看清..."
"线上问题复现不了，上下文全丢了，这bug怎么修？"

### 😱 99%的开发者都有的盲区

我们每天都在用自己开发的产品，却常常忽略一个残酷事实：**开发者视角 ≠ 用户体验**！

当我们以普通用户身份浏览时：
- 🖥️ 99%的时间根本不会打开控制台
- 🔄 遇到问题第一反应是"刷新重试"
- 🕶️ 对偶尔的卡顿、加载失败视而不见

**这些被忽略的瞬间，就是线上bug的预警信号！**

等到真实用户反馈时，早已：
- 🕯️ 错误现场灰飞烟灭
- 🕵️ 复现步骤堪比破案
- 💻 上下文信息全部丢失
- ⏳ 修复周期无限拉长

### ✨ 让JS错误监控变得像呼吸一样自然

**JS Error Monitor** 就是你的前端守护神！它能：

✅ **无需控制台**：后台自动监控所有页面错误
✅ **实时捕获**：错误发生瞬间锁定完整上下文
✅ **静默运行**：浏览器插件形态，零干扰开发
✅ **即时提醒**：桌面通知不错过任何关键错误

简单说，它让你在**正常使用产品时自动完成错误监控**，把那些"差点错过"的小问题扼杀在萌芽状态，真正实现**在用户发现前解决问题**！


## 🚀 核心功能展示

### 实时JavaScript错误跟踪

![错误监控演示](assets/error-monitor-demo.png)

### 可配置的错误类型过滤

支持精确过滤各种错误类型：
- SyntaxError（语法错误）
- ReferenceError（引用错误）
- TypeError（类型错误）
- RangeError（范围错误）
- 以及自定义错误消息过滤

### 错误通知管理

桌面级通知提醒，不错过任何一个关键错误：

![错误通知](assets/notification-demo.png)

## 🔍 核心技术揭秘

### 为什么window.onerror比addEventListener('error')更靠谱？

很多开发者不知道的是，当使用框架（如Angular、React等）开发时，框架会劫持原生报错，最终通过onerror打印，而addEventListener('error')无法监听到框架内组件的报错！

这就是为什么我们需要同时实现多种错误监听机制：

```javascript
// 1. 监听全局JS错误 - 框架友好型
window.onerror = function(message, source, lineno, colno, error) {
  // 自定义错误处理逻辑
  logErrorToExtension({type: 'onerror', message, source, lineno, colno, error});
  // 注意：返回true会阻止默认处理
  return false;
};

// 2. 监听资源加载错误
window.addEventListener('error', function(event) {
  if (event.target instanceof HTMLScriptElement) {
    logErrorToExtension({type: 'resource', target: event.target.src});
  }
}, true);

// 3. 监听未捕获的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
  logErrorToExtension({type: 'promise', reason: event.reason});
  // 可选：阻止默认处理
  // event.preventDefault();
});
```

### 浏览器插件开发核心技术

#### manifest.json配置

```json
{
  "name": "DevUIDevHelper",
  "version": "1.0",
  "manifest_version": 3,
  "description": "前端开发辅助工具集",
  "permissions": ["activeTab", "scripting", "notifications"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["features/js-error-monitor/content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

#### 错误监控核心实现

<mcfile name="content.js" path="c:\Users\liuguolin\Desktop\myProject\dev\DevUIDevHelper\features\js-error-monitor\content.js"></mcfile>:

```javascript
// 存储原始的onerror函数
const originalOnError = window.onerror;

// 重写window.onerror
window.onerror = function(message, source, lineno, colno, error) {
  // 收集错误信息
  const errorInfo = {
    timestamp: new Date().toISOString(),
    type: 'onerror',
    message: message.toString(),
    source,
    lineno,
    colno,
    stack: error?.stack || 'No stack trace available',
    url: window.location.href
  };

  // 发送错误到插件后台
  chrome.runtime.sendMessage({
    action: 'jsError',
    payload: errorInfo
  });

  // 调用原始的onerror
  if (originalOnError) {
    return originalOnError.apply(window, arguments);
  }

  return false;
};

// 监听资源加载错误
window.addEventListener('error', function(event) {
  // 过滤掉JS错误，这些会由window.onerror处理
  if (!(event.target instanceof HTMLScriptElement)) return;

  const errorInfo = {
    timestamp: new Date().toISOString(),
    type: 'resourceError',
    message: `Resource load failed: ${event.target.src}`,
    source: event.target.src,
    url: window.location.href
  };

  chrome.runtime.sendMessage({
    action: 'jsError',
    payload: errorInfo
  });
}, true);

// 监听未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    type: 'unhandledrejection',
    message: event.reason?.message || event.reason?.toString() || 'Unhandled promise rejection',
    stack: event.reason?.stack || 'No stack trace available',
    url: window.location.href
  };

  chrome.runtime.sendMessage({
    action: 'jsError',
    payload: errorInfo
  });
});
```

## 🎯 效果演示：js-error-test.html

为了直观展示错误监控效果，我们提供了专门的测试页面 <mcfile name="js-error-test.html" path="c:\Users\liuguolin\Desktop\myProject\dev\DevUIDevHelper\features\js-error-monitor\js-error-test.html"></mcfile>：

```html
<!DOCTYPE html>
<html>
<head>
    <title>JS Error Monitor Test Page</title>
</head>
<body>
    <h1>JS Error Monitor Test Page</h1>
    <button onclick="throw new Error('故意抛出的错误')">触发普通错误</button>
    <button onclick="nonexistentFunction()">触发引用错误</button>
    <button onclick="JSON.parse('{invalid json}')">触发语法错误</button>
    <button onclick="new Promise((resolve, reject) => reject('未处理的Promise错误'))">触发Promise错误</button>
    <button onclick="document.querySelector('nonexistent-element').innerHTML = 'test'">触发DOM错误</button>

    <script src="error-script.js"></script>
</body>
</html>
```

当点击这些按钮时，错误会立即被捕获并显示在插件面板中：

![测试页面演示](assets/test-page-demo.png)

## 📦 如何使用这个神器？

### 1. 下载源码

```bash
git clone https://github.com/yourusername/DevUIDevHelper.git
```

### 2. 安装到浏览器

1. 打开Chrome浏览器，输入`chrome://extensions/`
2. 开启右上角"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录

### 3. 开始使用

在任意网页点击插件图标，开启JS Error Monitor功能，即可实时监控页面错误！

## 🤝 贡献与交流

如果你有任何建议或发现bug，欢迎提交issue或PR！项目地址：

- Project Link: [https://gitcode.com/liuguolin/DevUIDevHelper.git](https://gitcode.com/liuguolin/DevUIDevHelper.git)

## 💡 写在最后

前端错误监控是提升用户体验的关键一环，提前发现并解决错误永远要比事后解决要轻松的多。
如果你觉得这个项目有帮助，别忘了给个Star哦！

> 原创不易，转载请注明出处
> 关注我，获取更多前端黑科技

#前端开发 #JavaScript #错误监控 #浏览器插件 #前端工程化 #调试技巧