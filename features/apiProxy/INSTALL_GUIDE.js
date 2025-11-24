#!/usr/bin/env node

/**
 * 插件安装和测试指南
 * 
 * 本文件说明如何在 Chrome 中加载和测试该插件
 */

console.log(`
╔══════════════════════════════════════════════════════════════╗
║       API 代理转发工具 - Chrome 插件安装和测试指南           ║
╚══════════════════════════════════════════════════════════════╝

📦 项目结构
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

apiProxy/
├── manifest.json              # 插件配置文件
├── background.js              # 后台 Service Worker
├── content-script.js          # 内容脚本
├── injected.js                # 注入的脚本
├── popup/                      # Popup 界面
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── managers/                   # 管理模块
│   ├── rule-manager.js
│   ├── cookie-manager.js
│   ├── logger.js
│   └── storage-manager.js
├── icons/                      # 插件图标
└── README.md                   # 使用文档

🚀 安装步骤
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 打开 Chrome 浏览器

2. 访问 chrome://extensions/

3. 在右上角启用"开发者模式"（Developer mode）

4. 点击"加载未封装的扩展程序"（Load unpacked）

5. 选择项目文件夹路径：
   c:\\Users\\liuguolin\\Desktop\\myProject\\dev\\DevUIDevHelper\\features\\apiProxy

6. 点击"打开"，插件将被加载

7. 你应该会看到 API 代理转发工具出现在已安装的扩展列表中

🧪 快速测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

方法 1：测试 fetch 请求

1. 在浏览器控制台执行：
   fetch('https://api.github.com/repos')
     .then(r => r.json())
     .then(d => console.log(d))

2. 在插件的日志面板应该能看到这个请求

方法 2：测试 XMLHttpRequest

1. 在浏览器控制台执行：
   const xhr = new XMLHttpRequest();
   xhr.open('GET', 'https://api.github.com/repos');
   xhr.onload = () => console.log(xhr.responseText);
   xhr.send();

2. 同样能在日志面板看到这个请求

方法 3：创建转发规则进行测试

1. 点击插件图标打开 Popup
2. 点击"+ 添加新规则"
3. 创建一个测试规则：
   - 规则名称：GitHub API 代理
   - 源 URL 模式：https://api\\.github\\.com/(.*)
   - 目标 URL：https://api.github.com/$1
   - 方法：GET

4. 返回浏览器控制台执行：
   fetch('https://api.github.com/repos')
     .then(r => r.json())
     .then(d => console.log(d))

5. 在日志面板应该能看到请求被转发

🔧 调试和开发
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 打开 Popup 的开发者工具
   - 右键点击 Popup 窗口
   - 选择"检查"或"Inspect"

2. 查看后台 Service Worker 日志
   - 在 chrome://extensions/ 中找到该插件
   - 点击"Service Worker"链接打开开发者工具

3. 查看 Content Script 日志
   - 在网页中打开开发者工具（F12）
   - 查看 Console 面板

4. 监听 Chrome 消息
   - 在 background.js 或 content-script.js 中添加 console.log
   - 重新加载插件后查看日志

⚠️ 常见问题排查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

问题：插件图标灰色，无法点击
→ 解决：确保网页 URL 为 http:// 或 https://
       某些特殊网页（如 chrome:// 内容）不能运行插件

问题：请求未被拦截
→ 解决：1. 检查规则是否启用（查看规则列表）
       2. 检查 URL 匹配模式是否正确
       3. 打开开发者工具检查 Console 中的错误信息

问题：Cookie 获取失败
→ 解决：1. 确保已在另一个标签页登录到目标服务器
       2. 检查浏览器 Cookie 权限设置
       3. 尝试手动配置 Cookie

问题：转发失败，显示 CORS 错误
→ 解决：1. 这是正常的跨域保护机制
       2. 确认目标服务器支持转发请求
       3. 检查是否需要添加特定 Headers

📝 测试用例
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

用例 1：基本 URL 转发
- 源模式：https://test\\.example\\.com/(.*)
- 目标：https://api.example.com/$1
- 测试 URL：https://test.example.com/api/users
- 预期转发到：https://api.example.com/api/users

用例 2：路径替换
- 源模式：https://(.+)/test/(.*)
- 目标：https://$1/prod/$2
- 测试 URL：https://example.com/test/api/users
- 预期转发到：https://example.com/prod/api/users

用例 3：端口转换
- 源模式：https://localhost:3000/(.*)
- 目标：http://127.0.0.1:8080/$1
- 测试 URL：https://localhost:3000/api/data
- 预期转发到：http://127.0.0.1:8080/api/data

用例 4：多规则测试
1. 创建两个规则：
   规则 A：https://api\\.v1\\.(.+) → https://api.$1
   规则 B：https://api\\.v2\\.(.+) → https://api-v2.$1

2. 验证只有匹配的规则被应用

📚 相关资源
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chrome 扩展开发文档：
https://developer.chrome.com/docs/extensions/

Manifest V3 迁移指南：
https://developer.chrome.com/docs/extensions/mv3/

正则表达式参考：
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions

✅ 验证清单
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ 插件已成功加载到 Chrome
□ 可以打开 Popup 窗口
□ 可以创建新规则
□ 可以编辑现有规则
□ 可以删除规则
□ Cookie 管理功能正常
□ 日志可以正确记录请求
□ 日志可以搜索和过滤
□ 支持导入导出规则
□ 支持导入导出日志

🎉 你已准备好开始使用 API 代理转发工具！

如有任何问题，请参考 README.md 或检查浏览器开发者工具中的错误信息。
`);
