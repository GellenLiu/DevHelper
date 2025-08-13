import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 引入 Vue DevUI 组件库及样式
import DevUI from 'vue-devui';
import 'vue-devui/style.css';
// 引入路由
import router from './router'

createApp(App).use(DevUI).use(router).mount('#app')
