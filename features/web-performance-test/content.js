// content.js

// 全局变量
let isElementSelectionActive = false;
let selectedElementSelector = '';
let performanceData = {
    loadTime: 0,
    fcp: 0,
    tti: 0,
    rtti: 0,
    lcp: 0,
    cls: 0
};
let pageStartTime = 0;

// 全局变量
let isPluginEnabled = true;

// 初始化
function init() {
    // 加载插件状态和选中元素
    chrome.storage.sync.get(['isPluginEnabled', 'selectedElementSelector'], (result) => {
        if (result.isPluginEnabled !== undefined) {
            isPluginEnabled = result.isPluginEnabled;
        }
        if (result.selectedElementSelector) {
            selectedElementSelector = result.selectedElementSelector;
        }
        
        // 如果插件已启用，开始性能测试
        if (isPluginEnabled) {
            startPerformanceTest(selectedElementSelector);
        }
    });

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'startElementSelection') {
            if (isPluginEnabled) {
                startElementSelection(sendResponse);
                return true; // 保持消息通道打开
            } else {
                sendResponse({ success: false, error: '插件已关闭' });
            }
        } else if (message.action === 'startPerformanceTest') {
            if (isPluginEnabled) {
                startPerformanceTest(message.selectedElementSelector);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: '插件已关闭' });
            }
        } else if (message.action === 'togglePlugin') {
            isPluginEnabled = message.enabled;
            sendResponse({ success: true });
        }
    });
}

// 开始元素选择
function startElementSelection(sendResponse) {
    isElementSelectionActive = true;
    
    // 立即发送响应，让popup窗口关闭
    if (sendResponse) {
        sendResponse({ success: true });
    }
    
    // 添加视觉反馈样式
    const style = document.createElement('style');
    style.id = 'performance-tester-selection-style';
    style.textContent = `
        * {
            cursor: crosshair !important;
            user-select: none !important;
        }
        .performance-tester-hover {
            outline: 2px solid #4a90e2 !important;
            background-color: rgba(74, 144, 226, 0.1) !important;
            transition: all 0.1s ease !important;
            z-index: 999999 !important;
        }
        .performance-tester-selection-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.1);
            pointer-events: none;
            z-index: 999998;
        }
    `;
    document.head.appendChild(style);
    
    // 添加半透明遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'performance-tester-selection-overlay';
    document.body.appendChild(overlay);

    // 鼠标悬停效果
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    
    // 点击选择元素
    const handleClick = (e) => {
        // 在捕获阶段阻止默认行为和事件传播
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const element = e.target;
        const selector = getElementSelector(element);
        
        // 移除视觉反馈
        removeSelectionStyles();
        
        // 移除遮罩层
        if (overlay) {
            overlay.remove();
        }
        
        // 发送选中的元素信息
        chrome.runtime.sendMessage({ 
            action: 'elementSelected', 
            selector: selector 
        });
        
        // 保存到存储
        chrome.storage.sync.set({ selectedElementSelector: selector });
        
        // 显示提示
        showSelectionToast(selector);
        
        // 移除事件监听器（注意第三个参数true要保持一致）
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('keydown', handleKeyDown);
        
        isElementSelectionActive = false;
    };
    
    // 按ESC键取消选择
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            // 移除视觉反馈
            removeSelectionStyles();
            
            // 移除遮罩层
            if (overlay) {
                overlay.remove();
            }
            
            // 移除事件监听器（注意第三个参数true要保持一致）
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeyDown);
            
            isElementSelectionActive = false;
        }
    };
    
    // 在捕获阶段添加点击事件监听器，确保优先处理选择逻辑
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
}

// 显示选择成功提示
function showSelectionToast(selector) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4a90e2;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    toast.textContent = `已选择元素: ${selector}`;
    document.body.appendChild(toast);
    
    // 3秒后移除提示
    setTimeout(() => {
        toast.remove();
        style.remove();
    }, 3000);
}

// 处理鼠标悬停
function handleMouseOver(e) {
    if (isElementSelectionActive) {
        e.target.classList.add('performance-tester-hover');
    }
}

// 处理鼠标移出
function handleMouseOut(e) {
    if (isElementSelectionActive) {
        e.target.classList.remove('performance-tester-hover');
    }
}

// 移除选择样式
function removeSelectionStyles() {
    const style = document.getElementById('performance-tester-selection-style');
    if (style) {
        style.remove();
    }
    
    const elements = document.querySelectorAll('.performance-tester-hover');
    elements.forEach(el => el.classList.remove('performance-tester-hover'));
    
    document.removeEventListener('mouseover', handleMouseOver);
    document.removeEventListener('mouseout', handleMouseOut);
}

// 获取元素的CSS选择器
function getElementSelector(element) {
    if (!element || element === document || element === window) {
        return '';
    }
    
    let path = [];
    let current = element;
    
    // 向上遍历DOM树，构建选择器路径
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.tagName.toLowerCase();
        
        // 如果有ID，直接使用ID选择器并结束
        if (current.id) {
            selector = `#${current.id}`;
            path.unshift(selector);
            break;
        }
        
        // 如果有类名，使用类名选择器
        if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/);
            if (classes.length > 0) {
                // 只使用第一个类名，避免选择器过长
                selector += `.${classes[0]}`;
            }
        }
        
        // 检查是否有同名兄弟元素，如果有则添加nth-child
        const siblings = Array.from(current.parentNode.children);
        if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
        }
        
        path.unshift(selector);
        current = current.parentNode;
        
        // 限制选择器长度，避免过于复杂
        if (path.length > 5) {
            break;
        }
    }
    
    return path.join(' > ');
}

// 开始性能测试
function startPerformanceTest(selector) {
    selectedElementSelector = selector;
    pageStartTime = performance.now();
    
    // 重置性能数据
    performanceData = {
        loadTime: 0,
        fcp: 0,
        tti: 0,
        rtti: 0,
        lcp: 0,
        cls: 0,
        // 新增更多性能指标
        totalLoadTime: 0,
        dnsTime: 0,
        tcpTime: 0,
        whiteScreenTime: 0,
        ttfb: 0,
        tbt: 0,
        longTasks: 0,
        fps: 0,
        networkTime: 0
    };
    
    // 监听性能指标
    observePerformanceMetrics();
    
    // 如果选择了元素，监听元素出现
    if (selectedElementSelector) {
        observeElementAppearance(selectedElementSelector);
    }
    
    // 页面加载完成后发送数据
    // 优先监听load事件，确保获取完整的loadEventEnd数据
    window.addEventListener('load', () => {
        // 页面加载完成后，重新计算性能指标以获取最新的loadEventEnd值
        calculateLoadMetrics();
        // 延迟发送数据，确保所有性能指标都已收集
        setTimeout(sendPerformanceData, 1000);
    });
    
    // 如果5秒后仍未触发load事件，使用当前数据发送
    setTimeout(() => {
        // 重新计算性能指标，使用最新的可用数据
        calculateLoadMetrics();
        sendPerformanceData();
    }, 5000);
}

// 计算加载相关指标的函数，用于在页面加载完成后重新计算
function calculateLoadMetrics() {
    console.log('重新计算加载相关指标');
    const timing = performance.timing;
    const navigationEntries = performance.getEntriesByType('navigation');
    const navigationEntry = navigationEntries.length > 0 ? navigationEntries[0] : null;
    
    console.log('Timing数据:', {
        loadEventEnd: timing.loadEventEnd,
        navigationStart: timing.navigationStart
    });
    
    // 1. 使用标准公式计算页面总加载时间
    let totalLoadTime = 0;
    
    // 检查timing.loadEventEnd是否有效
    if (timing.loadEventEnd > timing.navigationStart) {
        totalLoadTime = timing.loadEventEnd - timing.navigationStart;
        console.log('使用标准公式计算加载时间:', totalLoadTime);
    }
    // 2. 如果timing API无效，尝试使用navigationEntry
    else if (navigationEntry && navigationEntry.loadEventEnd > navigationEntry.startTime) {
        totalLoadTime = navigationEntry.loadEventEnd - navigationEntry.startTime;
        console.log('使用navigationEntry计算加载时间:', totalLoadTime);
    }
    // 3. 如果都无效，使用performance.now()（相对于页面加载的时间）
    else {
        totalLoadTime = performance.now();
        console.log('使用performance.now()计算加载时间:', totalLoadTime);
    }
    
    // 更新性能数据
    performanceData.loadTime = totalLoadTime;
    performanceData.totalLoadTime = totalLoadTime;
    
    console.log('更新后的性能数据:', {
        loadTime: performanceData.loadTime,
        totalLoadTime: performanceData.totalLoadTime
    });
    
    // 更新其他基于timing的指标
    if (timing.responseEnd > timing.navigationStart) {
        performanceData.networkTime = timing.responseEnd - timing.navigationStart;
    }
    
    if (timing.responseStart > timing.navigationStart) {
        performanceData.ttfb = timing.responseStart - timing.navigationStart;
    }
}

// 监听性能指标
function observePerformanceMetrics() {
    // 获取timing数据
    const timing = performance.timing;
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    
    // 计算页面总加载时间，确保值为正数
    let totalLoadTime = timing.loadEventEnd - timing.navigationStart;
    if (totalLoadTime <= 0) {
        // 如果loadEventEnd未触发，直接使用performance.now()
        totalLoadTime = performance.now();
    }
    performanceData.totalLoadTime = totalLoadTime;
    
    // 计算DNS解析时间，确保值为正数
    const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
    performanceData.dnsTime = dnsTime > 0 ? dnsTime : 0;
    
    // 计算TCP连接时间，确保值为正数
    const tcpTime = timing.connectEnd - timing.connectStart;
    performanceData.tcpTime = tcpTime > 0 ? tcpTime : 0;
    
    // 计算网络耗时（从导航开始到响应结束），确保值为正数
    const networkTime = timing.responseEnd - timing.navigationStart;
    performanceData.networkTime = networkTime > 0 ? networkTime : 0;
    
    // 计算首字节时间TTFB，确保值为正数
    const ttfb = timing.responseStart - timing.navigationStart;
    performanceData.ttfb = ttfb > 0 ? ttfb : 0;
    
    // 计算白屏时间（简化版，使用first-paint）
    const firstPaintObserver = new PerformanceObserver((entries) => {
        const firstPaintEntry = entries.getEntriesByName('first-paint')[0];
        if (firstPaintEntry) {
            performanceData.whiteScreenTime = firstPaintEntry.startTime;
        }
    });
    firstPaintObserver.observe({ type: 'paint', buffered: true });
    
    // 监听导航事件，获取加载时间
    const navigationObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach(entry => {
            if (entry.type === 'navigation') {
                // 使用navigationEntry的标准计算方式
                if (entry.loadEventEnd > entry.startTime) {
                    performanceData.loadTime = entry.loadEventEnd - entry.startTime;
                    performanceData.totalLoadTime = entry.loadEventEnd - entry.startTime;
                    console.log('NavigationObserver: 使用loadEventEnd计算加载时间:', performanceData.loadTime);
                } else {
                    // 使用当前performance.now()作为备选
                    performanceData.loadTime = performance.now();
                    performanceData.totalLoadTime = performance.now();
                    console.log('NavigationObserver: 使用performance.now()计算加载时间:', performanceData.loadTime);
                }
            }
        });
    });
    navigationObserver.observe({ type: 'navigation', buffered: true });
    
    // 监听FCP
    const fcpObserver = new PerformanceObserver((entries) => {
        const fcpEntry = entries.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) {
            performanceData.fcp = fcpEntry.startTime;
        }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
    
    // 监听LCP - LCP可能会有多个条目，取最后一个
    const lcpObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach((entry) => {
            performanceData.lcp = entry.startTime;
        });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // 监听CLS - 累积所有布局偏移值
    let cumulativeLayoutShift = 0;
    const clsObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
                cumulativeLayoutShift += entry.value;
            }
        });
        performanceData.cls = cumulativeLayoutShift;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    
    // 监听TTI（简化版，使用domInteractive）
    if (navigationEntry) {
        performanceData.tti = navigationEntry.domInteractive;
    }
    
    // 监听总阻塞时间TBT
    let totalBlockingTime = 0;
    const longTaskObserver = new PerformanceObserver((entries) => {
        entries.getEntries().forEach((entry) => {
            // 长任务定义为执行时间超过50ms的任务
            const blockingTime = entry.duration - 50;
            if (blockingTime > 0) {
                totalBlockingTime += blockingTime;
            }
        });
        performanceData.tbt = totalBlockingTime;
        performanceData.longTasks = entries.getEntries().length;
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
    
    // 简单计算FPS（模拟值，实际应用中需要更复杂的计算）
    // 这里使用固定值，实际应用中可以通过requestAnimationFrame计算
    performanceData.fps = 60; // 默认值，实际应用中可以动态计算
}

// 监听元素出现
function observeElementAppearance(selector) {
    // 立即检查元素是否已经存在
    const checkElement = () => {
        const element = document.querySelector(selector);
        if (element && performanceData.rtti === 0) {
            // 元素出现时的时间减去加载开始的时间
            const elementAppearTime = performance.now();
            performanceData.rtti = elementAppearTime - pageStartTime;
            observer.disconnect();
        }
    };
    
    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver(() => {
        checkElement();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
    
    // 立即检查一次
    checkElement();
    
    // 5秒后超时
    setTimeout(() => {
        observer.disconnect();
    }, 5000);
}

// 发送性能数据
function sendPerformanceData() {
    chrome.runtime.sendMessage({ 
        action: 'performanceData', 
        data: performanceData 
    });
}

// 初始化脚本
init();