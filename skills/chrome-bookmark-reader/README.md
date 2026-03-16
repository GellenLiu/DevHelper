# Chrome Bookmark Reader Skill

## 功能介绍

该技能可以自动读取Chrome浏览器的收藏书签，以结构化格式返回给大模型进行分析。支持书签的快速检索和模糊搜索功能。

## 技术实现

### 核心功能

1. **书签读取**：自动定位并读取Chrome浏览器的书签文件
2. **结构解析**：将书签数据解析为结构化格式
3. **搜索功能**：支持模糊搜索和精确搜索
4. **文件夹筛选**：按文件夹名称获取书签

### 实现原理

- **书签文件定位**：通过环境变量和标准路径查找Chrome书签文件
- **数据解析**：使用JSON解析书签数据结构
- **搜索算法**：实现基于关键词的模糊匹配和精确匹配
- **结构化输出**：返回包含标题、URL、路径等信息的结构化书签数据

## 使用方法

### 基本用法

1. **获取所有书签**：调用`get_all_bookmarks()`方法获取所有书签
2. **搜索书签**：调用`search_bookmarks(keyword, fuzzy=True)`方法搜索书签
3. **按文件夹获取**：调用`get_bookmarks_by_folder(folder_name)`方法按文件夹获取书签

### 示例代码

```python
from bookmark_reader import ChromeBookmarkReader

# 初始化阅读器
reader = ChromeBookmarkReader()

# 获取所有书签
all_bookmarks = reader.get_all_bookmarks()

# 搜索书签
search_results = reader.search_bookmarks('javascript')

# 按文件夹获取书签
folder_results = reader.get_bookmarks_by_folder('技术')

# 显示结果
reader.display_bookmarks(search_results)
```

## 注意事项

1. **文件权限**：确保程序有读取Chrome书签文件的权限
2. **Chrome路径**：默认支持标准Chrome安装路径，如需自定义路径请修改代码
3. **数据安全**：该工具仅读取书签数据，不会修改任何书签
4. **性能优化**：对于大量书签，可能需要优化搜索性能

## 扩展功能

- **导出功能**：可扩展为导出书签到CSV或其他格式
- **书签管理**：可添加书签的增删改查功能
- **跨浏览器支持**：可扩展支持Firefox、Edge等其他浏览器

## 故障排除

### 常见问题

1. **找不到书签文件**：检查Chrome是否已安装，或手动指定书签文件路径
2. **权限错误**：确保程序有读取书签文件的权限
3. **解析错误**：可能是书签文件格式异常，尝试重新启动Chrome

### 解决方案

- **手动指定路径**：在`get_chrome_bookmarks_path()`方法中添加自定义路径
- **检查文件权限**：确保当前用户有读取Chrome配置文件夹的权限
- **验证文件格式**：使用JSON验证工具检查书签文件格式是否正确
