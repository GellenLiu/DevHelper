# MateChat - 智能对话助手

## 📖 项目简介

MateChat 是一款集成AI能力的智能开发助手，专为开发者设计，提供代码解释、问题解答、代码生成、技术文档撰写等功能，助力开发者提升开发效率，解决技术难题。

## ✨ 核心功能

- **代码解释**：智能分析代码，提供清晰易懂的解释和说明
- **代码生成**：根据需求生成高质量的代码片段，支持多种编程语言
- **技术问题解答**：解答各类技术问题，提供专业的解决方案
- **代码优化建议**：分析现有代码，提供优化建议和最佳实践
- **技术文档撰写**：根据代码或需求生成详细的技术文档
- **多语言支持**：支持JavaScript、Python、Java、C++等多种编程语言
- **上下文理解**：能够理解对话上下文，提供连贯的回答
- **支持多种AI模型**：可切换不同的AI模型，适应不同的需求场景

## 🚀 快速开始

### 安装方式

1. 从Chrome应用商店安装（即将上线）
2. 开发模式安装：
   - 克隆仓库到本地
   - 在Chrome浏览器中打开 `chrome://extensions`
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"，选择项目根目录

### 使用说明

1. 点击浏览器右上角的MateChat图标打开聊天面板
2. 选择AI模型（可选）
3. 输入您的问题或需求
4. 等待AI生成回答
5. 可以继续追问或提出新的问题

## 📷 功能截图

<div align="center">
  <img src="./img/matechat.png" alt="MateChat 智能助手" width="600">
  <p align="center" style="font-size: 0.8em; margin-top: 0.5em;">MateChat 智能助手主界面</p>
</div>

## 🛠️ 技术栈

- HTML/CSS/JavaScript - 前端界面开发
- Chrome Extension API - 浏览器扩展API
- 多种AI模型集成 - 提供智能对话能力
- CodeMirror - 代码编辑器集成
- 支持多种编程语言的语法高亮

## 📝 使用场景

### 1. 代码解释

**输入**：
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

**MateChat输出**：
这是一个防抖（debounce）函数，用于限制函数在一定时间内的调用频率。当函数被频繁调用时，debounce会确保只有在最后一次调用后的指定时间（wait）内没有再次调用时，才会执行该函数。

### 2. 代码生成

**输入**：
```
生成一个Vue 3的计数器组件，支持递增、递减和重置功能
```

**MateChat输出**：
```vue
<template>
  <div class="counter">
    <h2>计数器: {{ count }}</h2>
    <div class="buttons">
      <button @click="increment">+</button>
      <button @click="decrement">-</button>
      <button @click="reset">重置</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);

const increment = () => {
  count.value++;
};

const decrement = () => {
  count.value--;
};

const reset = () => {
  count.value = 0;
};
</script>

<style scoped>
.counter {
  text-align: center;
  padding: 20px;
}

.buttons {
  margin-top: 20px;
}

button {
  margin: 0 10px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
</style>
```

### 3. 技术问题解答

**输入**：
```
如何优化React应用的性能？
```

**MateChat输出**：
优化React应用性能的常用方法包括：
1. 使用React.memo()优化组件渲染
2. 使用useMemo()和useCallback()缓存计算结果和函数
3. 合理使用key属性，避免不必要的DOM重新渲染
4. 懒加载组件和路由
5. 优化列表渲染，使用虚拟滚动
6. 减少不必要的重渲染，合理设计组件结构
7. 使用React DevTools分析性能瓶颈
8. 优化状态管理，避免全局状态过度更新

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进MateChat！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系我们：

- 项目地址：[https://gitcode.com/liuguolin/DevHelper.git](https://gitcode.com/liuguolin/DevHelper.git)
- Issue：[https://gitcode.com/liuguolin/DevHelper.git/issues](https://gitcode.com/liuguolin/DevHelper.git/issues)