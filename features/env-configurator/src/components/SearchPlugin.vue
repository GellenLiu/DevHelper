<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

// Props
const props = defineProps<{
  searchTargetSelector: string;
}>();

// 搜索相关状态
const searchInput = ref('');
const currentMatchIndex = ref(-1);
const totalMatches = ref(0);
const matches = ref<HTMLElement[]>([]);
const isSearchActive = ref(false);
const searchPanelVisible = ref(false);

// 搜索功能
const performSearch = (searchText: string) => {
  if (!searchText.trim()) {
    clearSearch();
    return;
  }

  // 获取搜索目标元素
  const targetElement = document.querySelector(props.searchTargetSelector);
  if (!targetElement) return;

  // 收集所有文本节点
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    targetElement,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      textNodes.push(node as Text);
    }
  }

  // 清空之前的高亮
  clearHighlight();
  
  // 再次收集文本节点，确保获取的是最新的DOM结构
  const freshTextNodes: Text[] = [];
  const freshWalker = document.createTreeWalker(
    targetElement,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let freshNode;
  while ((freshNode = freshWalker.nextNode())) {
    if (freshNode.nodeType === Node.TEXT_NODE && freshNode.textContent?.trim()) {
      freshTextNodes.push(freshNode as Text);
    }
  }

  // 执行搜索
  const searchTerm = searchText.toLowerCase();
  console.log('freshTextNodes', freshTextNodes)
  freshTextNodes.forEach((textNode) => {
    const parentElement = textNode.parentElement;
    if (!parentElement || !textNode.textContent) return;

    const textContent = textNode.textContent.toLowerCase();
    if (textContent.includes(searchTerm)) {
      // 创建高亮元素
      const tempDiv = document.createElement('div');
      let lastIndex = 0;
      let matchIndex = textContent.indexOf(searchTerm, lastIndex);
      console.log('matchIndex', matchIndex, textContent)

      while (matchIndex !== -1) {
        // 添加匹配前的文本
        if (matchIndex > lastIndex) {
          tempDiv.appendChild(document.createTextNode(textNode.textContent!.slice(lastIndex, matchIndex)));
        }

        // 添加高亮的匹配文本
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'search-highlight';
        highlightSpan.textContent = textNode.textContent!.slice(matchIndex, matchIndex + searchTerm.length);
        tempDiv.appendChild(highlightSpan);
        matches.value.push(highlightSpan);
        console.log('highlightSpan', highlightSpan)
        totalMatches.value++;

        lastIndex = matchIndex + searchTerm.length;
        matchIndex = textContent.indexOf(searchTerm, lastIndex);
      }

      // 添加剩余文本
      if (lastIndex < textNode.textContent.length) {
        tempDiv.appendChild(document.createTextNode(textNode.textContent.slice(lastIndex)));
      }

      // 替换原始文本节点
      parentElement.replaceChild(tempDiv, textNode);
    }
  });

  if (totalMatches.value > 0) {
    currentMatchIndex.value = 0;
    highlightCurrentMatch();
  }
};

// 清空搜索
const clearSearch = () => {
  clearHighlight();
  searchInput.value = '';
  matches.value = [];
  totalMatches.value = 0;
  currentMatchIndex.value = -1;
  isSearchActive.value = false;
};

// 清空高亮
const clearHighlight = () => {
  // 首先检查是否有高亮元素需要清理
  const highlights = document.querySelectorAll('.search-highlight');
  
  if (highlights.length > 0) {
    // 记录所有需要被替换的父元素
    const parentsToReplace = new Set<Element>();
    
    highlights.forEach((highlight) => {
      const parent = highlight.parentElement;
      if (parent) {
        parentsToReplace.add(parent);
      }
    });
    
    // 对每个父元素进行处理
    parentsToReplace.forEach((parent) => {
      try {
        // 合并相邻的文本节点
        const text = Array.from(parent.childNodes)
          .map((node) => node.textContent || '')
          .join('');
        const textNode = document.createTextNode(text);
        
        // 安全地替换节点
        if (parent.parentNode) {
          parent.parentNode.replaceChild(textNode, parent);
        }
      } catch (error) {
        console.warn('Error clearing highlight:', error);
      }
    });
  }
  
  // 重置匹配状态
  matches.value = [];
  totalMatches.value = 0;
  currentMatchIndex.value = -1;
};

// 高亮当前匹配项
const highlightCurrentMatch = () => {
  if (matches.value.length === 0 || currentMatchIndex.value < 0) return;

  // 移除所有当前高亮
  matches.value.forEach((match) => {
    match.classList.remove('search-highlight-current');
  });

  // 添加当前高亮
  const currentMatch = matches.value[currentMatchIndex.value];
  currentMatch.classList.add('search-highlight-current');
  
  // 滚动到当前匹配项 - 增强版
  // 使用setTimeout确保DOM已经更新
  setTimeout(() => {
    // 先尝试标准滚动方法
    try {
      currentMatch.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    } catch (error) {
      // 降级方案：使用直接滚动
      currentMatch.scrollIntoView();
    }
    
    // 额外确保元素可见
    const rect = currentMatch.getBoundingClientRect();
    const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
    
    // 检查元素是否在视口中
    if (rect.top < 0 || rect.bottom > viewHeight || rect.left < 0 || rect.right > viewWidth) {
      // 如果不在视口中，使用window.scrollTo强制滚动
      window.scrollTo({
        top: rect.top + window.pageYOffset - viewHeight / 3, // 偏上一点以便更好地查看上下文
        left: rect.left + window.pageXOffset - viewWidth / 3,
        behavior: 'smooth'
      });
    }
    
    // 增加一个短暂的闪烁效果，让用户更容易看到当前匹配项
    currentMatch.style.opacity = '0.5';
    setTimeout(() => {
      currentMatch.style.opacity = '1';
    }, 100);
  }, 0);
};

// 查找下一个匹配项
const findNext = () => {
  if (totalMatches.value === 0) return;
  
  currentMatchIndex.value = (currentMatchIndex.value + 1) % totalMatches.value;
  highlightCurrentMatch();
};

// 查找上一个匹配项
const findPrevious = () => {
  if (totalMatches.value === 0) return;
  
  currentMatchIndex.value = (currentMatchIndex.value - 1 + totalMatches.value) % totalMatches.value;
  highlightCurrentMatch();
};

// 处理搜索输入变化
const handleSearchInput = (value: string) => {
  searchInput.value = value;
  if (value.trim()) {
    performSearch(value);
  } else {
    clearSearch();
  }
};

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + F
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault();
    searchPanelVisible.value = true;
    isSearchActive.value = true;
    // 延迟聚焦以确保面板可见
    setTimeout(() => {
      const searchInputElement = document.querySelector('.search-input');
      (searchInputElement as HTMLElement)?.focus();
    }, 100);
  }

  // Escape键关闭搜索面板
  if (event.key === 'Escape' && searchPanelVisible.value) {
    closeSearchPanel();
  }

  // 仅在搜索面板可见时处理其他快捷键
  if (!searchPanelVisible.value) return;

  // Enter键查找下一个
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    // 防止事件传播导致的重复执行问题
    event.stopPropagation();
    // 直接操作索引，不依赖外部状态
    if (totalMatches.value > 0) {
      currentMatchIndex.value = (currentMatchIndex.value + 1) % totalMatches.value;
      highlightCurrentMatch();
    }
  }

  // Shift + Enter键查找上一个
  if (event.key === 'Enter' && event.shiftKey) {
    event.preventDefault();
    // 防止事件传播导致的重复执行问题
    event.stopPropagation();
    // 直接操作索引，不依赖外部状态
    if (totalMatches.value > 0) {
      currentMatchIndex.value = (currentMatchIndex.value - 1 + totalMatches.value) % totalMatches.value;
      highlightCurrentMatch();
    }
  }
};

// 关闭搜索面板
const closeSearchPanel = () => {
  searchPanelVisible.value = false;
  clearSearch();
};

// 监听搜索输入变化
watch(searchInput, (newValue) => {
  if (newValue.trim()) {
    performSearch(newValue);
  } else {
    clearSearch();
  }
});

// 组件挂载时添加事件监听器
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

// 组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  clearHighlight();
});
</script>

<template>
  <div v-if="searchPanelVisible" class="search-plugin-overlay">
    <div class="search-plugin-panel">
      <div class="search-plugin-content">
        <input
          class="search-input"
          type="text"
          v-model="searchInput"
          placeholder="搜索... (Esc 关闭)"
          @input="handleSearchInput(($event.target as HTMLInputElement)?.value ?? '')"
          @keydown="handleKeyDown"
          ref="searchInputRef"
        />
        <div class="search-plugin-match-info">
          {{ currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0 }} / {{ totalMatches }}
        </div>
        <div class="search-plugin-buttons">
          <button class="search-btn" @click="findPrevious" title="上一个 (Shift+Enter)">
            ↑
          </button>
          <button class="search-btn" @click="findNext" title="下一个 (Enter)">
            ↓
          </button>
        </div>
        <button class="search-close-btn" @click="closeSearchPanel" title="关闭搜索">×</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 父容器需要设置 position: relative */
:deep(.container) {
  position: relative;
}

.search-plugin-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
}

.search-plugin-panel {
  background: white;
  border-radius: 4px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  padding: 4px;
  padding-bottom: 0;
  width: 100%;
}

.search-plugin-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
}

.search-input {
  flex: 1;
  border: 1px solid #d7d8da;
  border-radius: 4px;
  outline: none;
  font-size: 12px;
  padding: 4px 8px;
  min-width: 80px;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.search-plugin-match-info {
  font-size: 12px;
  color: #666;
  min-width: 30px;
  text-align: center;
}

.search-plugin-buttons {
  display: flex;
  gap: 2px;
}

.search-btn {
  background: white;
  border: 1px solid #ddd;
  border-radius: 2px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  padding: 0;
  transition: all 0.3s;
}

.search-btn:hover {
  background: #f0f0f0;
  border-color: #bbb;
}

.search-close-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 16px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  transition: all 0.3s;
  line-height: 1;
}

.search-close-btn:hover {
  color: #333;
  border-color: #bbb;
  background: #f0f0f0;
}

/* 全局样式，需要通过deep注入到父组件 */
:global(.search-highlight) {
  background-color: rgba(255, 255, 0, 0.5);
  border-radius: 2px;
}

:global(.search-highlight-current) {
  background-color: rgba(255, 165, 0, 0.8);
  border: 1px solid orange;
}
</style>