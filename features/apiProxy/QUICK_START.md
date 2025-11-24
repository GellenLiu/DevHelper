# ⚡ 快速启动指南

## 5 分钟快速开始

### 第 1 步：加载插件（2 分钟）

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. **右上角启用** "开发者模式"
4. 点击 **"加载未封装的扩展程序"**
5. 选择文件夹：`c:\Users\liuguolin\Desktop\myProject\dev\DevUIDevHelper\features\apiProxy`
6. 完成！👍

### 第 2 步：创建第一个规则（2 分钟）

1. 点击浏览器工具栏的插件图标
2. 点击 **"+ 添加新规则"** 按钮
3. 填写以下信息：
   ```
   规则名称: GitHub 转发测试
   源 URL 模式: https://api\.github\.com/(.*)
   目标 URL: https://api.github.com/$1
   方法: GET
   ```
4. 点击 **"保存规则"** ✅

### 第 3 步：测试转发（1 分钟）

1. 打开浏览器控制台（F12）
2. 执行以下命令：
   ```javascript
   fetch('https://api.github.com/users')
     .then(r => r.json())
     .then(d => console.log('✅ 成功:', d))
     .catch(e => console.error('❌ 失败:', e))
   ```
3. 在插件的 **"日志"** 标签页查看请求

## 🎯 常用操作

### 创建从测试到生产的转发规则

```
规则名称: 测试→生产
源 URL 模式: https://test\.example\.com/api/(.*)
目标 URL: https://api.example.com/$1
启用 Cookie: ✓
自动获取 Cookie: ✓
```

### 创建到本地服务器的转发规则

```
规则名称: 本地开发
源 URL 模式: https://api\.example\.com/(.*)
目标 URL: http://localhost:3000/$1
```

### 添加自定义 Header

在编辑规则时：
1. 点击 **"+ 添加 Header"**
2. 例如添加 Authorization:
   ```
   Header 名称: Authorization
   Header 值: Bearer your-token-here
   ```

## 📋 快速参考

| 功能 | 位置 |
|------|------|
| 添加规则 | 规则标签页 → "+ 添加新规则" |
| 编辑规则 | 规则列表 → 选择规则 → "编辑" |
| 删除规则 | 规则列表 → 选择规则 → "删除" |
| 启用/禁用规则 | 规则列表 → 点击切换按钮 |
| 管理 Cookie | 规则编辑 → "手动配置 Cookie" |
| 查看日志 | 日志标签页 |
| 搜索日志 | 日志标签页 → 搜索框 |
| 导出规则 | 规则标签页 → "导出规则" |

## 🐛 快速问题排查

### 问题：插件图标灰色
**解决**：确保打开的是 http:// 或 https:// 网页

### 问题：请求未被转发
**解决**：
1. 确认规则已启用（启用按钮应为绿色）
2. 检查源 URL 模式是否正确
3. 在日志面板查看是否有错误

### 问题：Cookie 获取失败
**解决**：
1. 确保已在另一个标签页登录到目标服务器
2. 手动复制 Cookie 并在规则中配置
3. 点击"刷新 Cookie"按钮

## 📚 了解更多

- 详细文档：查看 `README.md`
- 完整安装指南：查看 `INSTALL_GUIDE.js`
- 技术架构：查看 `PROJECT_SUMMARY.md`

## ✨ 核心特性一览

- ✅ **多规则支持** - 配置无限个转发规则
- ✅ **正则表达式匹配** - 灵活的 URL 匹配
- ✅ **自动 Cookie** - 智能获取和管理
- ✅ **完整日志** - 记录所有请求/响应
- ✅ **导入导出** - 备份和恢复配置
- ✅ **本地存储** - 所有数据本地保存

---

**提示**：首次使用？按上面的 3 步操作就能立即开始使用！🚀
