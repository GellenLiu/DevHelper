/// <reference types="vite/client" />

declare global {
  interface Window {
    chrome: any;
  }

  // 也可以直接声明全局变量
  const chrome: any;
}