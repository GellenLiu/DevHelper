// popup.js

// 全局变量
let isPluginEnabled = true;
let selectedElementSelector = '';
let testResults = [];
let isTesting = false;
let averagePerformanceData = null; // 存储完整的平均性能数据
let isInterrupted = false; // 中断标志，用于中断测试

// DOM元素
const pluginToggle = document.getElementById('plugin-toggle');
const selectElementBtn = document.getElementById('select-element-btn');
const startTestBtn = document.getElementById('start-test-btn');
const refreshCountInput = document.getElementById('refresh-count');
const refreshIntervalInput = document.getElementById('refresh-interval');
const elementSelectorInput = document.getElementById('element-selector-input');
const selectedElementInfo = document.getElementById('selected-element-info');
const testStatus = document.getElementById('test-status');
const moreMetricsBtn = document.getElementById('more-metrics-btn');

// 结果展示元素
const loadTimeEl = document.getElementById('load-time');
const fcpEl = document.getElementById('fcp');
const ttiEl = document.getElementById('tti');
const rttiEl = document.getElementById('rtti');
const lcpEl = document.getElementById('lcp');
const clsEl = document.getElementById('cls');

// 初始化
function init() {
    // 添加事件监听器
    pluginToggle.addEventListener('change', togglePlugin);
    selectElementBtn.addEventListener('click', startElementSelection);
    startTestBtn.addEventListener('click', startPerformanceTest);
    elementSelectorInput.addEventListener('input', handleSelectorInput);
    moreMetricsBtn.addEventListener('click', openMoreMetricsPage);
    
    // 添加配置输入框的事件监听器，用于保存配置
    refreshCountInput.addEventListener('input', saveConfig);
    refreshIntervalInput.addEventListener('input', saveConfig);

    // 加载插件状态、配置和最新性能数据
    chrome.storage.sync.get(['isPluginEnabled', 'selectedElementSelector', 'refreshCount', 'refreshInterval', 'latestPerformanceData'], (result) => {
        if (result.isPluginEnabled !== undefined) {
            isPluginEnabled = result.isPluginEnabled;
            pluginToggle.checked = isPluginEnabled;
        }
        if (result.selectedElementSelector) {
            selectedElementSelector = result.selectedElementSelector;
            elementSelectorInput.value = selectedElementSelector;
        }
        // 加载刷新次数和间隔配置
        if (result.refreshCount) {
            refreshCountInput.value = result.refreshCount;
        }
        if (result.refreshInterval) {
            refreshIntervalInput.value = result.refreshInterval;
        }
        // 加载最新的性能数据
        if (result.latestPerformanceData) {
            displayCachedPerformanceData(result.latestPerformanceData);
        }
    });
}

// 显示缓存的性能数据
function displayCachedPerformanceData(data) {
    // 保存完整的平均性能数据
    averagePerformanceData = data;
    
    // 显示结果并添加颜色
    loadTimeEl.textContent = `${formatNumber(data.loadTime)} ms`;
    loadTimeEl.className = `result-card-value ${getPerformanceColorClass(data.loadTime, 'loadTime')}`;
    
    fcpEl.textContent = `${formatNumber(data.fcp)} ms`;
    fcpEl.className = `result-card-value ${getPerformanceColorClass(data.fcp, 'fcp')}`;
    
    ttiEl.textContent = `${formatNumber(data.tti)} ms`;
    ttiEl.className = `result-card-value ${getPerformanceColorClass(data.tti, 'tti')}`;
    
    rttiEl.textContent = selectedElementSelector ? `${formatNumber(data.rtti)} ms` : '未选择元素';
    rttiEl.className = `result-card-value ${selectedElementSelector ? getPerformanceColorClass(data.rtti, 'rtti') : ''}`;
    
    lcpEl.textContent = `${formatNumber(data.lcp)} ms`;
    lcpEl.className = `result-card-value ${getPerformanceColorClass(data.lcp, 'lcp')}`;
    
    clsEl.textContent = formatNumber(data.cls);
    clsEl.className = `result-card-value ${getPerformanceColorClass(data.cls, 'cls')}`;
}

// 保存配置到存储
function saveConfig() {
    const refreshCount = refreshCountInput.value;
    const refreshInterval = refreshIntervalInput.value;
    
    chrome.storage.sync.set({
        refreshCount: refreshCount,
        refreshInterval: refreshInterval
    });
}

// 处理选择器输入
function handleSelectorInput() {
    selectedElementSelector = elementSelectorInput.value.trim();
    if (selectedElementSelector) {
        chrome.storage.sync.set({ selectedElementSelector });
    } else {
        selectedElementInfo.textContent = '';
        chrome.storage.sync.remove('selectedElementSelector');
    }
}

// 插件开关
function togglePlugin() {
    isPluginEnabled = pluginToggle.checked;
    chrome.storage.sync.set({ isPluginEnabled });
    
    // 如果关闭插件且正在测试，中断测试
    if (!isPluginEnabled && isTesting) {
        isInterrupted = true;
    }
    
    // 向当前激活的标签页发送开关状态变化，添加错误处理
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'togglePlugin', 
                enabled: isPluginEnabled 
            }, (response) => {
                // 忽略错误，可能是页面未加载完成或content script未初始化
                if (chrome.runtime.lastError) {
                    // 静默处理，不影响用户体验
                    return;
                }
            });
        }
    });
}

// 开始元素选择
function startElementSelection() {
    // 向当前标签页发送消息，开始元素选择模式
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, { action: 'startElementSelection' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError);
                return;
            }
            if (response && response.success) {
                // 自定义popup不会自动关闭，无需调用window.close()
                // window.close();
            }
        });
    });
}

// 开始性能测试
async function startPerformanceTest() {
    if (isTesting) return;
    
    isTesting = true;
    isInterrupted = false; // 重置中断标志
    startTestBtn.disabled = true;
    startTestBtn.textContent = '检测中...';
    testStatus.textContent = '准备开始检测...';
    testStatus.className = 'status-text loading';
    
    // 清空之前的测试结果
    testResults = [];
    clearResults();
    
    // 获取配置
    const count = parseInt(refreshCountInput.value);
    const interval = parseInt(refreshIntervalInput.value);
    
    // 遍历每个测试
    for (let i = 0; i < count; i++) {
        // 检查是否被中断
        if (isInterrupted) {
            break;
        }
        
        testStatus.textContent = `正在进行第 ${i + 1}/${count} 次检测...`;
        
        // 监听性能数据
        const performanceData = await new Promise((resolve) => {
            // 使用单次监听器，确保每次测试只接收一次数据
            const listener = (message) => {
                if (message.action === 'performanceData') {
                    // 立即移除监听器，避免重复接收
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve(message.data);
                }
            };
            
            // 添加监听器
            chrome.runtime.onMessage.addListener(listener);
            
            // 设置超时，防止无限等待
            const timeoutId = setTimeout(() => {
                chrome.runtime.onMessage.removeListener(listener);
                resolve({
                    loadTime: 0,
                    fcp: 0,
                    tti: 0,
                    rtti: 0,
                    lcp: 0,
                    cls: 0,
                    // 新增的性能指标
                    totalLoadTime: 0,
                    dnsTime: 0,
                    tcpTime: 0,
                    whiteScreenTime: 0,
                    ttfb: 0,
                    tbt: 0,
                    longTasks: 0,
                    fps: 0,
                    networkTime: 0
                });
            }, 10000);
            
            // 刷新页面
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0) {
                    clearTimeout(timeoutId);
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve({
                        loadTime: 0,
                        fcp: 0,
                        tti: 0,
                        rtti: 0,
                        lcp: 0,
                        cls: 0,
                        // 新增的性能指标
                        totalLoadTime: 0,
                        dnsTime: 0,
                        tcpTime: 0,
                        whiteScreenTime: 0,
                        ttfb: 0,
                        tbt: 0,
                        longTasks: 0,
                        fps: 0,
                        networkTime: 0
                    });
                    return;
                }
                
                chrome.tabs.reload(tabs[0].id, {}, () => {
                    // 页面刷新后，content script会自动重新初始化并开始收集性能数据
                    // 不需要额外发送startPerformanceTest消息，因为content.js会自动处理
                });
            });
        });
        
        testResults.push(performanceData);
        
        // 等待指定间隔
        if (i < count - 1) {
            await sleep(interval);
        }
    }
    
    // 检查是否被中断
    if (isInterrupted) {
        isTesting = false;
        startTestBtn.disabled = false;
        startTestBtn.textContent = '开始检测';
        testStatus.textContent = '检测已中断';
        testStatus.className = 'status-text error';
        return;
    }
    
    // 计算平均值
    calculateAverageResults();
    
    // 结束测试
    isTesting = false;
    startTestBtn.disabled = false;
    startTestBtn.textContent = '开始检测';
    testStatus.textContent = '检测完成！';
    testStatus.className = 'status-text success';
}

// 发送消息给当前激活的标签页
function sendMessageToActiveTab(message) {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                resolve(null);
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                if (chrome.runtime.lastError) {
                    // 忽略错误，可能是页面未加载完成
                    resolve(null);
                    return;
                }
                resolve(response);
            });
        });
    });
}

// 刷新当前激活的标签页
function refreshActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.reload(tabs[0].id, {}, () => {
                // 页面开始加载，等待content script初始化
                setTimeout(() => {
                    // 发送开始测试消息
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        action: 'startPerformanceTest',
                        selectedElementSelector: selectedElementSelector
                    });
                    resolve();
                }, 500);
            });
        });
    });
}

// 等待函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 格式化数字，添加千分位分隔符
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '--';
    
    // 对于CLS，保留3位小数
    if (num < 1 && num > 0) {
        return num.toFixed(3);
    }
    
    // 对于其他数值，保留2位小数并添加千分位分隔符
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 清空结果
function clearResults() {
    loadTimeEl.textContent = '--';
    loadTimeEl.className = 'result-card-value';
    fcpEl.textContent = '--';
    fcpEl.className = 'result-card-value';
    ttiEl.textContent = '--';
    ttiEl.className = 'result-card-value';
    rttiEl.textContent = '--';
    rttiEl.className = 'result-card-value';
    lcpEl.textContent = '--';
    lcpEl.className = 'result-card-value';
    clsEl.textContent = '--';
    clsEl.className = 'result-card-value';
}

// 根据性能值获取颜色类
function getPerformanceColorClass(value, metricType) {
    // 性能指标阈值（参考Web Vitals）
    const thresholds = {
        loadTime: { good: 2000, warn: 4000 }, // ms
        fcp: { good: 1800, warn: 3000 },      // ms
        tti: { good: 3800, warn: 7300 },      // ms
        rtti: { good: 2000, warn: 4000 },     // ms
        lcp: { good: 2500, warn: 4000 },      // ms
        cls: { good: 0.1, warn: 0.25 }        // 无单位
    };
    
    const threshold = thresholds[metricType];
    if (!threshold) return '';
    
    if (value <= threshold.good) {
        return 'result-card-value-good';
    } else if (value <= threshold.warn) {
        return 'result-card-value-warn';
    } else {
        return 'result-card-value-bad';
    }
}

// 打开更多性能指标页面
function openMoreMetricsPage() {
    if (!averagePerformanceData) {
        testStatus.textContent = '请先运行性能测试';
        testStatus.className = 'status-text error';
        return;
    }
    
    console.log('准备打开更多指标页面，性能数据:', averagePerformanceData);
    
    // 构建URL，将性能数据作为参数传递
    // 使用encodeURIComponent确保数据被正确编码
    const dataStr = encodeURIComponent(JSON.stringify(averagePerformanceData));
    const url = chrome.runtime.getURL(`more-metrics.html?data=${dataStr}`);
    
    console.log('构建的URL:', url);
    
    // 打开新页面
    chrome.tabs.create({ url: url });
}

// 计算平均结果
function calculateAverageResults() {
    if (testResults.length === 0) return;
    
    // 初始化所有性能指标的平均值计算
    const avg = {
        loadTime: 0,
        fcp: 0,
        tti: 0,
        rtti: 0,
        lcp: 0,
        cls: 0,
        // 新增的性能指标
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
    
    // 求和
    testResults.forEach(result => {
        avg.loadTime += result.loadTime || 0;
        avg.fcp += result.fcp || 0;
        avg.tti += result.tti || 0;
        avg.rtti += result.rtti || 0;
        avg.lcp += result.lcp || 0;
        avg.cls += result.cls || 0;
        // 新增的性能指标求和
        avg.totalLoadTime += result.totalLoadTime || 0;
        avg.dnsTime += result.dnsTime || 0;
        avg.tcpTime += result.tcpTime || 0;
        avg.whiteScreenTime += result.whiteScreenTime || 0;
        avg.ttfb += result.ttfb || 0;
        avg.tbt += result.tbt || 0;
        avg.longTasks += result.longTasks || 0;
        avg.fps += result.fps || 0;
        avg.networkTime += result.networkTime || 0;
    });
    
    // 计算平均值
    const count = testResults.length;
    avg.loadTime = Math.round((avg.loadTime / count) * 100) / 100;
    avg.fcp = Math.round((avg.fcp / count) * 100) / 100;
    avg.tti = Math.round((avg.tti / count) * 100) / 100;
    avg.rtti = Math.round((avg.rtti / count) * 100) / 100;
    avg.lcp = Math.round((avg.lcp / count) * 100) / 100;
    avg.cls = Math.round((avg.cls / count) * 1000) / 1000;
    // 新增的性能指标平均值
    avg.totalLoadTime = Math.round((avg.totalLoadTime / count) * 100) / 100;
    avg.dnsTime = Math.round((avg.dnsTime / count) * 100) / 100;
    avg.tcpTime = Math.round((avg.tcpTime / count) * 100) / 100;
    avg.whiteScreenTime = Math.round((avg.whiteScreenTime / count) * 100) / 100;
    avg.ttfb = Math.round((avg.ttfb / count) * 100) / 100;
    avg.tbt = Math.round((avg.tbt / count) * 100) / 100;
    avg.longTasks = Math.round(avg.longTasks / count);
    avg.fps = Math.round((avg.fps / count) * 10) / 10;
    avg.networkTime = Math.round((avg.networkTime / count) * 100) / 100;
    
    // 保存完整的平均性能数据
    averagePerformanceData = avg;
    
    // 保存最新的性能数据到存储
    chrome.storage.sync.set({ latestPerformanceData: avg });
    
    // 显示结果并添加颜色
    loadTimeEl.textContent = `${formatNumber(avg.loadTime)} ms`;
    loadTimeEl.className = `result-card-value ${getPerformanceColorClass(avg.loadTime, 'loadTime')}`;
    
    fcpEl.textContent = `${formatNumber(avg.fcp)} ms`;
    fcpEl.className = `result-card-value ${getPerformanceColorClass(avg.fcp, 'fcp')}`;
    
    ttiEl.textContent = `${formatNumber(avg.tti)} ms`;
    ttiEl.className = `result-card-value ${getPerformanceColorClass(avg.tti, 'tti')}`;
    
    rttiEl.textContent = selectedElementSelector ? `${formatNumber(avg.rtti)} ms` : '未选择元素';
    rttiEl.className = `result-card-value ${selectedElementSelector ? getPerformanceColorClass(avg.rtti, 'rtti') : ''}`;
    
    lcpEl.textContent = `${formatNumber(avg.lcp)} ms`;
    lcpEl.className = `result-card-value ${getPerformanceColorClass(avg.lcp, 'lcp')}`;
    
    clsEl.textContent = formatNumber(avg.cls);
    clsEl.className = `result-card-value ${getPerformanceColorClass(avg.cls, 'cls')}`;
}

// 接收来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'elementSelected') {
        selectedElementSelector = message.selector;
        elementSelectorInput.value = selectedElementSelector;
        chrome.storage.sync.set({ selectedElementSelector });
        sendResponse({ success: true });
    }
    // 移除了performanceData监听器，因为startPerformanceTest函数已经处理了性能数据的收集
    // 避免重复添加数据到testResults数组中
});

// 初始化插件
init();