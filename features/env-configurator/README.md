# Env Configurator - 智能环境配置管理工具

## 📖 项目简介

Env Configurator 是一款强大的环境配置修改器，专为前端开发者设计，用于动态切换和修改网页环境配置，无需重新构建即可快速切换开发/测试/生产环境。

## ✨ 核心功能

- **实时配置修改**：劫持环境配置，实时修改配置参数，无时序影响
- **多环境管理**：支持配置多个环境（开发、测试、生产等），一键切换
- **自定义配置项**：允许开发者自定义环境配置参数，灵活适应不同项目需求
- **配置持久化**：保存配置到本地存储，刷新页面后配置依然有效
- **可视化操作**：直观的配置界面，易于操作和管理
- **支持多种框架**：兼容React、Vue、Angular等主流前端框架

## 🚀 快速开始

### 安装方式

1. 从Chrome应用商店安装（即将上线）
2. 开发模式安装：
   - 克隆仓库到本地
   - 在Chrome浏览器中打开 `chrome://extensions`
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"，选择项目根目录

### 使用说明

1. 点击浏览器右上角的Env Configurator图标打开配置面板
2. 选择或创建环境配置
3. 修改配置参数并保存
4. 刷新页面，新配置将立即生效

## 🛠️ 技术栈

- Vue 3 - 前端框架
- Vite - 构建工具
- TypeScript - 类型系统
- Chrome Extension API - 浏览器扩展API

## 📝 配置说明

### 配置文件结构

```json
{
  "environments": [
    {
      "name": "开发环境",
      "config": {
        "API_BASE_URL": "https://dev-api.example.com",
        "DEBUG_MODE": true,
        "THEME": "light"
      }
    },
    {
      "name": "生产环境",
      "config": {
        "API_BASE_URL": "https://api.example.com",
        "DEBUG_MODE": false,
        "THEME": "dark"
      }
    }
  ]
}
```

### 支持的配置类型

- 字符串 (String)
- 布尔值 (Boolean)
- 数字 (Number)
- 对象 (Object)
- 数组 (Array)

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进Env Configurator！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系我们：

- 项目地址：[https://gitcode.com/liuguolin/DevHelper.git](https://gitcode.com/liuguolin/DevHelper.git)
- Issue：[https://gitcode.com/liuguolin/DevHelper.git/issues](https://gitcode.com/liuguolin/DevHelper.git/issues)