# Dev Helper - 让开发更高效，让工作更轻松

一站式前端开发提效浏览器扩展工具套件，集成多种自研实用工具，助力开发者解决日常开发中的各类痛点问题，显著提升开发效率🚀 。

## 🌟 核心优势

- **自研工具集合**：精心打造的前端开发工具，针对性解决实际开发难题
- **模块化架构**：每个工具独立封装，支持按需加载，便于扩展和定制
- **开源协作**：完全开源，欢迎社区贡献，持续迭代优化
- **浏览器原生支持**：基于Chrome扩展开发，无需额外安装依赖，开箱即用

## Agent Skills
- **[chrome-bookmark-reader](.trae/skills/chrome-bookmark-reader/SKILL.md)** - 书签检索技能，读取Chrome浏览器的收藏书签，结构性返回给大模型进行分析。支持书签的快速检索和模糊搜索。
- **[api-mock-server](.trae/skills/api-mock-server/SKILL.md)** - 支持rest接口mock、SSE流式接口mock、mock配置分享、mock地址分享等

## 🛠️ 项目自研工具列表

以下是我们自主研发的核心工具，点击工具名称可查看详细文档：

- **[API Proxy 接口代理转发工具](./features/apiProxy/README.md)** - 将页面XHR/Fetch请求，转发到其他后端环境，支持配置多条规则，支持cookie自动获取，header配置等
- **[Env Configurator 环境配置修改器](./features/env-configurator/README.md)** - 前端环境配置设置工具，支持动态切换和修改环境变量，无需重新构建即可切换开发/测试/生产环境
- **[JS Error Monitor 前端JS错误监控工具](./features/js-error-monitor/readme.md)** - 实时JavaScript错误监控系统，捕获页面运行时错误，提供详细的错误堆栈和上下文信息，便于快速定位问题
- **[Personal AI Helper for MateChat 个人智能对话助手](./features/matechat/readme.md)** - 基于MateChat构建的个人智能对话助手，支持直连LLM，打造个人智能助手
- **[Web Perf Tester 网页性能测试工具](./features/web-performance-test/readme.md)** - 网页性能测试工具，多次测试取平均值，支持RTTI指标测试
- **[API Mock服务](https://gitcode.com/liuguolin/apiMockServer)** - 支持rest接口mock、SSE流式接口mock、mock配置分享、mock地址分享等

## 📦 其他优秀工具推荐

以下是前端开发者常用的优质Chrome扩展，点击插件名称可直接跳转到Chrome商店安装：

- **[Vue.js DevTools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)** - Vue应用调试工具，支持组件检查、性能分析等功能
- **[XSwitch-v3](https://chromewebstore.google.com/detail/xswitch-v3/dgocjnalnkkghhpdfgjinkhjigkggjdg)** - 接口转发工具
- **[tweak: mock and modify HTTP requests](https://chromewebstore.google.com/detail/tweak-mock-and-modify-htt/feahianecghpnipmhphmfgmpdodhcapi)** - 便捷接口响应mock，适合前端调试
- **[Tampermonkey (篡改猴)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)** - 强大的脚本管理器，允许安装和运行自定义脚本，扩展浏览器功能
- **[FeHelper](https://chrome.google.com/webstore/detail/fehelper%E5%89%8D%E7%AB%AF%E5%BC%80%E5%8F%91%E5%8A%A9%E6%89%8B/pkgccpejnmalmdinmhkkfafefagiiiad)** - 前端开发助手，集成JSON格式化、代码压缩、二维码生成等多种实用工具
- **[Allow CORS: Access-Control-Allow-Origin](https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf)** - 允许跨域请求，解决开发过程中的跨域问题，支持自定义配置
- **[Imagine](https://github.com/meowtec/Imagine)** - 本地图片压缩工具 
- **[SwitchHosts](https://switchhosts.vercel.app/zh)** - 一个管理、切换多个host方案的工具
- **[automa](https://chromewebstore.google.com/detail/automa/infppggnoaenmfagbfknfkancpbljcca?hl=zh-CN&utm_source=ext_sidebar)** - 浏览器自动工作流工具

## 📥 安装使用

### 从Chrome应用商店安装
即将上线...

### 开发模式安装
1. 克隆仓库或下载release压缩包
```bash
git clone https://gitcode.com/liuguolin/DevHelper.git
cd DevHelper
```

2. 在Chrome浏览器中加载扩展：
   - 打开Chrome浏览器并导航至 `chrome://extensions`
   - 在右上角启用"开发者模式"
   - 点击"加载已解压的扩展程序" (Env Configurator、JS Error Monitor选择output目录，其他选择features下对应工具目录)

## 🤝 贡献指南

### 贡献流程

1. 将新功能按照模块化设计，放置在`features`目录下
2. 每个功能模块需包含完整的插件结构和独立的README文档
3. 遵循项目的代码规范和提交规范

### Pull Request规范
1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 📄 开源协议

本项目采用MIT许可证 - 详见[LICENSE](LICENSE)文件。

## 加入我们

- 项目地址：[https://gitcode.com/liuguolin/DevHelper.git](https://gitcode.com/liuguolin/DevHelper.git)
- 问题反馈：[https://gitcode.com/liuguolin/DevHelper.git/issues](https://gitcode.com/liuguolin/DevHelper.git/issues)

## 🙏 致谢

感谢所有为项目做出贡献的开发者和用户，你们的支持是我们前进的动力！

---

**Dev Helper** - 让开发更高效，让工作更轻松！ 🚀