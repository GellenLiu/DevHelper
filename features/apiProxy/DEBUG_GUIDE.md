# API Proxy 调试指南

## 问题诊断：接口没有被转发

如果页面发送的请求没有被转发到目标地址，请按照以下步骤进行诊断：

### 1. 打开浏览器开发者工具

在需要代理的页面上按 **F12** 打开开发者工具，进入 **Console** 标签。

### 2. 查看调试日志

所有的代理过程都有详细的日志输出，格式为：
- `[Fetch]` - Fetch 请求拦截日志
- `[XHR]` - XMLHttpRequest 拦截日志  
- `[Content Script]` - 内容脚本消息转发日志
- `[Background]` - 后台脚本处理日志

### 3. 完整的请求流程应该看起来像这样

```
页面发送请求
↓
[Fetch] Intercepted: https://test.example.com/api/users ID: 1234567890.123
↓
[Content Script] INTERCEPT_REQUEST received, ID: 1234567890.123
↓
[Background] INTERCEPT_REQUEST received, ID: 1234567890.123, URL: https://test.example.com/api/users
↓
[Background] Rule matched: 转发到生产环境
↓
[Background] Target URL: https://api.example.com/api/users
↓
[Background] Forwarding request to: https://api.example.com/api/users
↓
[Background] Got response status: 200
↓
[Content Script] Got response from background for ID: 1234567890.123
↓
[Content Script] Sending FORWARD_RESPONSE for ID: 1234567890.123, status: 200
↓
[Fetch] Got FORWARD_RESPONSE for ID: 1234567890.123, Status: 200, Error: undefined
↓
[Fetch] Resolved with proxy response, status: 200
↓
页面收到代理后的响应 ✓
```

### 4. 常见问题诊断

#### 问题 A: 看不到 [Intercept] 日志
- 说明请求拦截失败
- **检查项**：
  - 确保规则已启用
  - 检查规则的 URL 模式是否正确匹配页面的请求 URL
  - 尝试在规则的 URL 模式中使用更宽松的正则表达式

#### 问题 B: 有 [INTERCEPT_REQUEST] 日志但没有 [Background] 日志
- 说明消息没有正确发送到后台脚本
- **检查项**：
  - 检查浏览器扩展是否正确加载
  - 尝试重新加载扩展（在 `chrome://extensions/` 中点击刷新）

#### 问题 C: 有 [Background] 日志但显示 "No rule matched"
- 说明规则没有匹配请求
- **检查项**：
  - 检查规则的源 URL 模式与实际请求 URL 是否匹配
  - 检查规则的请求方法是否与页面的请求方法匹配
  - 点击规则的"编辑"按钮查看完整配置

#### 问题 D: 显示 "Rule matched" 但没有看到 "Got response status"
- 说明转发请求失败
- **检查项**：
  - 目标 URL 是否正确
  - 目标服务器是否可访问
  - 是否有网络错误或超时
  - 检查浏览器控制台的错误日志

#### 问题 E: 有完整的日志链但页面没有收到响应
- 说明响应没有正确返回给页面
- **检查项**：
  - 检查网络是否有跨域错误
  - 查看 [Fetch] 或 [XHR] 的最后一行日志
  - 如果显示 "Timeout"，说明后台响应没有及时返回

### 5. 测试步骤

1. **打开需要代理的页面** (例如: `https://test.example.com`)

2. **创建一个代理规则**：
   - 打开扩展 Popup
   - 点击"添加新规则"
   - 源 URL 模式: `https://test\.example\.com/api/.*`
   - 目标 URL: `https://api.example.com/$1`
   - 点击"保存"

3. **在页面上发送请求**：
   - 打开浏览器开发者工具 (F12)
   - 在页面上触发会发送 API 请求的操作
   - 查看 Console 中的日志

4. **检查响应**：
   - 页面应该收到来自目标服务器的响应
   - 可以在 Network 标签中看到转发的请求 (如果浏览器支持)
   - 可以在 Logs 标签中查看详细的请求和响应信息

### 6. 查看详细日志

在扩展的 Popup 中：
1. 切换到 "日志" 标签
2. 点击你要调查的请求或响应
3. 可以看到完整的：
   - 原始地址 (sourceUrl)
   - 转发地址 (targetUrl)
   - 请求头 (headers)
   - 请求参数 (body)
   - 响应状态 (status)
   - 返回值 (response body)
   - 请求耗时 (duration)

### 7. 高级诊断

#### 查看后台脚本日志
1. 在 Chrome 地址栏输入 `chrome://extensions/`
2. 找到 "API Proxy" 扩展
3. 在 "服务工作者" 部分点击 "background.js" 的错误或日志链接
4. 查看后台脚本的控制台输出

#### 查看 Content Script 日志
- 在网页的开发者工具 Console 中查看带 `[Content Script]` 前缀的日志

#### 查看 Injected Script 日志
- 在网页的开发者工具 Console 中查看带 `[Fetch]` 或 `[XHR]` 前缀的日志

### 8. 常用的测试命令

在页面的开发者工具 Console 中执行：

```javascript
// 测试 Fetch 请求
fetch('https://test.example.com/api/test').then(r => r.json()).then(d => console.log('Fetch Response:', d))

// 测试 XHR 请求
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://test.example.com/api/test');
xhr.onload = () => console.log('XHR Response:', xhr.responseText);
xhr.send()
```

观察这些请求是否被拦截和转发。

### 9. 收集诊断信息

如果问题仍未解决，请收集以下信息提供支持：

1. **浏览器版本**: Chrome 版本号
2. **扩展版本**: 扩展的版本号
3. **完整的控制台日志输出**: 从请求开始到结束的所有日志
4. **规则配置**:
   - 源 URL 模式
   - 目标 URL
   - 请求方法
5. **网络信息**:
   - 原始请求 URL
   - 目标 URL
   - 请求状态码
   - 错误信息
