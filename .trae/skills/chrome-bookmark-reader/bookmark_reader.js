const fs = require('fs');
const path = require('path');
const os = require('os');

class ChromeBookmarkReader {
    constructor() {
        this.bookmarks = null;
        this.loadBookmarks();
    }

    getChromeBookmarksPath() {
        /**获取Chrome书签文件路径*/
        const appdata = process.env.LOCALAPPDATA;
        if (!appdata) {
            return null;
        }

        // 标准Chrome配置文件路径
        const paths = [
            path.join(appdata, 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks'),
            path.join(appdata, 'Google', 'Chrome', 'User Data', 'Profile 1', 'Bookmarks'),
            path.join(appdata, 'Google', 'Chrome', 'User Data', 'Profile 2', 'Bookmarks')
        ];

        for (const bookmarkPath of paths) {
            if (fs.existsSync(bookmarkPath)) {
                return bookmarkPath;
            }
        }

        return null;
    }

    loadBookmarks() {
        /**加载书签数据*/
        const bookmarksPath = this.getChromeBookmarksPath();
        if (!bookmarksPath) {
            console.log("未找到Chrome书签文件");
            return;
        }

        try {
            const data = fs.readFileSync(bookmarksPath, 'utf-8');
            this.bookmarks = JSON.parse(data);
            console.log(`成功加载书签文件: ${bookmarksPath}`);
        } catch (e) {
            console.log(`加载书签失败: ${e}`);
        }
    }

    parseBookmarks(node = null, currentPath = "") {
        /**解析书签数据，返回结构化的书签信息*/
        if (node === null) {
            if (!this.bookmarks) {
                return [];
            }
            node = this.bookmarks.roots || {};
        }

        const result = [];

        if (typeof node === 'object' && node !== null) {
            // 检查是否是roots字典（包含多个根节点）
            if ('bookmark_bar' in node || 'other' in node || 'synced' in node) {
                // 遍历所有根节点
                for (const [rootName, rootNode] of Object.entries(node)) {
                    result.push(...this.parseBookmarks(rootNode, rootName));
                }
            }
            // 处理文件夹
            else if (node.type === 'folder' || ('children' in node && !('url' in node))) {
                const folderName = node.name || 'Root';
                const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;

                if ('children' in node) {
                    for (const child of node.children) {
                        result.push(...this.parseBookmarks(child, newPath));
                    }
                }
            }
            // 处理书签
            else if (node.type === 'url' || ('url' in node && !('children' in node))) {
                const bookmark = {
                    title: node.name || '',
                    url: node.url || '',
                    path: currentPath,
                    date_added: node.date_added || '',
                    id: node.id || ''
                };
                result.push(bookmark);
            }
        } else if (Array.isArray(node)) {
            for (const item of node) {
                result.push(...this.parseBookmarks(item, currentPath));
            }
        }

        return result;
    }

    searchBookmarks(keyword, fuzzy = true) {
        /**搜索书签*/
        const allBookmarks = this.parseBookmarks();
        if (!allBookmarks.length) {
            return [];
        }

        const results = [];
        const keywordLower = keyword.toLowerCase();

        for (const bookmark of allBookmarks) {
            const title = bookmark.title.toLowerCase();
            const url = bookmark.url.toLowerCase();
            const bookmarkPath = bookmark.path.toLowerCase();

            if (fuzzy) {
                // 模糊搜索
                if (
                    title.includes(keywordLower) ||
                    url.includes(keywordLower) ||
                    bookmarkPath.includes(keywordLower)
                ) {
                    results.push(bookmark);
                }
            } else {
                // 精确搜索
                if (
                    keywordLower === title ||
                    keywordLower === url ||
                    keywordLower === bookmarkPath
                ) {
                    results.push(bookmark);
                }
            }
        }

        return results;
    }

    getBookmarksByFolder(folderName) {
        /**按文件夹获取书签*/
        const allBookmarks = this.parseBookmarks();
        if (!allBookmarks.length) {
            return [];
        }

        const results = [];
        const folderLower = folderName.toLowerCase();

        for (const bookmark of allBookmarks) {
            const path = bookmark.path.toLowerCase();
            if (path.includes(folderLower)) {
                results.push(bookmark);
            }
        }

        return results;
    }

    getAllBookmarks() {
        /**获取所有书签*/
        return this.parseBookmarks();
    }

    displayBookmarks(bookmarks) {
        /**显示书签信息*/
        if (!bookmarks.length) {
            console.log("没有找到书签");
            return;
        }

        console.log(`找到 ${bookmarks.length} 个书签:`);
        console.log("-" . repeat(80));

        for (let i = 0; i < bookmarks.length; i++) {
            const bookmark = bookmarks[i];
            console.log(`${i + 1}. 标题: ${bookmark.title || '无标题'}`);
            console.log(`   URL: ${bookmark.url || '无URL'}`);
            console.log(`   路径: ${bookmark.path || '无路径'}`);
            console.log("-" . repeat(80));
        }
    }
}

// 示例用法
if (require.main === module) {
    const reader = new ChromeBookmarkReader();

    // 示例：获取所有书签
    console.log("=== 所有书签 ===");
    const allBookmarks = reader.getAllBookmarks();
    reader.displayBookmarks(allBookmarks);

    // 示例：搜索书签
    console.log("\n=== 搜索 'javascript' ===");
    const searchResults = reader.searchBookmarks('javascript');
    reader.displayBookmarks(searchResults);

    // 示例：按文件夹获取书签
    console.log("\n=== 按文件夹获取 ===");
    const folderResults = reader.getBookmarksByFolder('技术');
    reader.displayBookmarks(folderResults);
}

module.exports = ChromeBookmarkReader;