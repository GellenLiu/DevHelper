// more-metrics.js
// 从URL参数中获取性能数据
function getPerformanceDataFromUrl() {
    console.log('开始从URL参数获取数据');
    
    // 获取完整的URL参数
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL参数:', Object.fromEntries(urlParams.entries()));
    
    const dataStr = urlParams.get('data');
    console.log('获取到的data参数:', dataStr);
    
    if (dataStr) {
        try {
            // 解码并解析数据
            const decodedData = decodeURIComponent(dataStr);
            console.log('解码后的数据:', decodedData);
            
            const parsedData = JSON.parse(decodedData);
            console.log('解析后的数据:', parsedData);
            
            return parsedData;
        } catch (e) {
            console.error('解析性能数据失败:', e);
            console.error('错误位置:', e.stack);
            return null;
        }
    }
    console.log('没有找到data参数');
    return null;
}

// 格式化数字
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '--';
    
    // 对于CLS，保留3位小数
    if (num < 1 && num > 0) {
        return num.toFixed(3);
    }
    
    // 对于其他数值，保留2位小数并添加ms后缀
    return `${num.toFixed(0)} ms`;
}

// 显示性能数据
function displayPerformanceData() {
    console.log('开始显示性能数据');
    const data = getPerformanceDataFromUrl();
    
    if (!data) {
        console.error('没有性能数据');
        document.getElementById('total-load-time').textContent = '获取数据失败';
        // 显示调试信息
        document.body.innerHTML += `<div style="margin-top: 20px; padding: 10px; background-color: #f8d7da; color: #721c24; border-radius: 4px;">调试信息：获取性能数据失败，请检查控制台日志</div>`;
        return;
    }

    console.log('准备显示性能数据:', data);
    
    // 更新各指标值
    document.getElementById('total-load-time').textContent = formatNumber(data.totalLoadTime);
    document.getElementById('dns-time').textContent = formatNumber(data.dnsTime);
    document.getElementById('tcp-time').textContent = formatNumber(data.tcpTime);
    document.getElementById('lcp').textContent = formatNumber(data.lcp);
    document.getElementById('tti').textContent = formatNumber(data.tti);
    document.getElementById('rtti').textContent = formatNumber(data.rtti);
    document.getElementById('cls').textContent = formatNumber(data.cls);
    document.getElementById('white-screen-time').textContent = formatNumber(data.whiteScreenTime);
    document.getElementById('ttfb').textContent = formatNumber(data.ttfb);
    document.getElementById('tbt').textContent = formatNumber(data.tbt);
    document.getElementById('long-tasks').textContent = data.longTasks || '--';
    document.getElementById('fps').textContent = data.fps ? `${data.fps.toFixed(1)} fps` : '--';
    document.getElementById('network-time').textContent = formatNumber(data.networkTime);
    
    console.log('性能数据显示完成');
}

// 页面加载完成后显示数据
window.addEventListener('load', displayPerformanceData);