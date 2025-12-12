# JS Error Monitor - 前端错误监控系统

## 📖 项目简介

JS Error Monitor 是一款专业的前端错误监控工具，实时捕获和分析网页JavaScript运行时错误，帮助开发者在第一时间发现并解决问题，提升网站的稳定性和用户体验。

## ✨ 核心功能

- **实时错误捕获**：实时监控网页JS错误，立即提示，避免在未打开控制台时漏掉重要错误
- **全面错误类型支持**：捕获SyntaxError、ReferenceError、TypeError等所有类型的JavaScript错误
- **详细错误信息**：提供完整的错误堆栈、错误类型、错误信息、发生位置等详细信息
- **可配置的错误过滤**：支持根据错误类型、错误消息、域名等条件过滤错误
- **错误统计与分析**：提供错误发生次数、频率等统计信息，帮助开发者识别高频问题
- **支持Source Map**：配合Source Map可将压缩后的代码错误映射到原始代码位置
- **自定义上报**：支持将错误信息上报到自定义服务器
- **轻量级设计**：对页面性能影响极小，资源占用低

## 🚀 快速开始

### 安装方式

1. 从Chrome应用商店安装（即将上线）
2. 开发模式安装：
   - 克隆仓库到本地
   - 在Chrome浏览器中打开 `chrome://extensions`
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"，选择项目根目录 `output目录`

### 使用说明

1. 点击浏览器右上角的JS Error Monitor图标打开监控面板
2. 配置错误过滤规则（可选）
3. 访问需要监控的网页
4. 当页面发生JavaScript错误时，监控面板将实时显示错误信息
5. 点击错误项可查看详细的错误堆栈和上下文信息

## 📷 功能截图

<div align="center">
  <img src="./assets/demo.png" alt="JS Error Monitor 效果图" width="600">
  <p align="center" style="font-size: 0.8em; margin-top: 0.5em;">JS Error Monitor 实时监控效果图</p>
</div>

<div align="center" style="margin-top: 20px;">
  <img src="./assets/config.png" alt="JS Error Monitor 配置页面" width="600">
  <p align="center" style="font-size: 0.8em; margin-top: 0.5em;">JS Error Monitor 配置页面</p>
</div>

## 🛠️ 技术栈

- Vanilla JavaScript - 核心开发语言
- Chrome Extension API - 浏览器扩展API
- HTML/CSS - 界面开发
- Local Storage - 本地数据存储

## 📝 配置说明

### 错误过滤配置

1. **按错误类型过滤**：可选择只监控特定类型的错误（如SyntaxError、ReferenceError等）
2. **按错误消息过滤**：可配置关键词，只监控包含特定关键词的错误
3. **按域名过滤**：可配置允许或禁止监控的域名列表
4. **忽略特定错误**：可添加特定错误的忽略规则

### 自定义上报配置

1. 启用自定义上报功能
2. 配置上报URL
3. 选择需要上报的错误信息字段
4. 配置上报频率（实时或批量）

## 📊 错误分析

### 错误类型分布

- SyntaxError：语法错误
- ReferenceError：引用错误
- TypeError：类型错误
- RangeError：范围错误
- URIError：URI错误
- EvalError：eval()函数执行错误

### 常见错误原因

1. 未定义的变量或函数
2. 类型转换错误
3. 数组越界访问
4. 异步操作中的错误
5. 第三方库错误
6. 网络请求错误

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进JS Error Monitor！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系我们：

- 项目地址：[https://gitcode.com/liuguolin/DevHelper.git](https://gitcode.com/liuguolin/DevHelper.git)
- Issue：[https://gitcode.com/liuguolin/DevHelper.git/issues](https://gitcode.com/liuguolin/DevHelper.git/issues)