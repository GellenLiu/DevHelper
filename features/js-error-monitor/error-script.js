(function() {
    // 当前配置
    let currentConfig = {
        enabled: false,
        monitoredDomains: [],
        errorTypes: {
            windowError: true,
            errorEvent: true,
            unhandledRejection: true,
            consoleError: true
        }
    };

    // 错误通知队列
    const errorNotifications = [];
    const MAX_NOTIFICATIONS = 3;

    // 检查当前域名是否在监控列表中（支持正则表达式）
    function isDomainMonitored() {
        const currentDomain = window.location.hostname;
        const monitoredDomains = currentConfig.monitoredDomains || [];
        
        if (monitoredDomains.length === 0) return false;
        
        return monitoredDomains.some(pattern => {
            if (!pattern) return false;
            
            // * 匹配所有域名
            if (pattern === '*') {
                return true;
            }
            
            // 将通配符和正则表达式转换为有效的RegExp
            const regexPattern = pattern
                .replace(/[\[\]\\\/.+?^${}()|]/g, '\\$&') // 转义正则特殊字符
                .replace(/\*/g, '.*'); // 将*转换为.*
            
            const regex = new RegExp(`^${regexPattern}$`, 'i');
            return regex.test(currentDomain);
        });
    }

    // 创建错误通知弹窗
    function createErrorNotification(error) {
        // 移除最旧的通知如果已达到最大数量
        if (errorNotifications.length >= MAX_NOTIFICATIONS) {
            const oldest = errorNotifications.shift();
            oldest.element.remove();
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: ${20 + errorNotifications.length * 110}px;
            right: 20px;
            width: 300px;
            padding: 15px;
            background-color: #fff;
            border-left: 4px solid #ff4d4f;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            border-radius: 4px;
            z-index: 999999;
            transition: all 0.3s;
        `;

        // 错误标题
        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 5px;
            color: #ff4d4f;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        title.textContent = 'JS Error Detected';

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: #999;
        `;
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            removeNotification(notification);
        });
        title.appendChild(closeBtn);

        // 错误信息
        const message = document.createElement('div');
        message.style.cssText = `
            font-size: 14px;
            color: #333;
            max-height: 80px;
            overflow-y: auto;
            margin-bottom: 5px;
        `;
        message.textContent = error.message || 'Unknown error';

        // 错误类型
        const type = document.createElement('div');
        type.style.cssText = `
            font-size: 12px;
            color: #666;
        `;
        type.textContent = `Type: ${error.type}`;

        // 添加元素到通知
        notification.appendChild(title);
        notification.appendChild(message);
        notification.appendChild(type);

        // 鼠标悬停时不自动消失
        let timeoutId;
        function scheduleRemoval() {
            timeoutId = setTimeout(() => {
                removeNotification(notification);
            }, 3000);
        }

        scheduleRemoval();

        notification.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
        });

        notification.addEventListener('mouseleave', scheduleRemoval);

        // 添加到文档和队列
        document.body.appendChild(notification);
        errorNotifications.push({ element: notification, timeoutId });

        // 调整现有通知位置
        updateNotificationPositions();
    }

    // 移除通知
    function removeNotification(notificationElement) {
        const index = errorNotifications.findIndex(item => item.element === notificationElement);
        if (index !== -1) {
            clearTimeout(errorNotifications[index].timeoutId);
            errorNotifications[index].element.remove();
            errorNotifications.splice(index, 1);
            updateNotificationPositions();
        }
    }

    // 更新通知位置
    function updateNotificationPositions() {
        errorNotifications.forEach((item, index) => {
            item.element.style.top = `${20 + index * 110}px`;
        });
    }

    // 处理错误
    function handleError(error) {
        if (!currentConfig.enabled) return;
        if (!isDomainMonitored()) return;

        // 错误类型过滤
        const errorType = error.errorType || error.type;
        if (currentConfig.errorTypes && typeof currentConfig.errorTypes[errorType.toLowerCase()] === 'boolean' && !currentConfig.errorTypes[errorType.toLowerCase()]) {
            return;
        }

        // 错误消息过滤
        if (currentConfig.errorMessageFilters && currentConfig.errorMessageFilters.length > 0) {
            const errorMessage = error.message || '';
            if (currentConfig.errorMessageFilters.some(filter => 
                errorMessage.includes(filter)
            )) {
                return;
            }
        }

        // 发送错误信息到content script
        window.postMessage({
            type: 'DEVUI_JS_ERROR_OCCURRED',
            error: error
        }, '*');

        // 显示通知
        createErrorNotification(error);
    }

    // 监听配置更新
    // 先设置监听器，再发送请求
    window.addEventListener('message', (event) => {
        if (event.data.type !== 'DEVUI_JS_ERROR_MONITOR_CONFIG') return;
        const newConfig = event.data.config;
        currentConfig = {
            ...currentConfig,
            ...newConfig,
            monitoredDomains: newConfig.monitoredDomains || []
        };
    });

    // 延迟发送请求，确保监听器已设置
    setTimeout(() => {
        window.postMessage({
            type: 'DEVUI_JS_ERROR_MONITOR_GET_CONFIG'
        }, '*');
    }, 100);

    // 监听window.onerror
    if (currentConfig.errorTypes.windowError) {
        console.log('onerror 开启')
        const originalWindowError = window.onerror;
        window.onerror = function(message, source, lineno, colno, error) {
            console.log('监听到onerror')
            const errorType = error ? error.name : 'window.onerror';
            handleError({
                eventType: 'window.onerror',
                errorType: errorType,
                message: message || error?.message || 'Unknown error',
                source: source,
                lineno: lineno,
                colno: colno,
                stack: error?.stack
            });

            if (originalWindowError) {
                return originalWindowError.apply(this, arguments);
            }
            return false;
        };
    }

    // 监听error事件
    if (currentConfig.errorTypes.errorEvent) {
        console.log('error开启')
        window.addEventListener('error', (event) => {
            console.log('监听到error')
            const errorType = event.error ? event.error.name : 'ResourceError';
            handleError({
                eventType: 'error event',
                errorType: errorType,
                message: event.error?.message || 'Resource loading error',
                source: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        }, true);
    }

    // 监听unhandledrejection事件
    if (currentConfig.errorTypes.unhandledRejection) {
        window.addEventListener('unhandledrejection', (event) => {
            const errorType = event.reason instanceof Error ? event.reason.name : 'UnhandledRejection';
            handleError({
                eventType: 'unhandledrejection',
                errorType: errorType,
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    }

    // 覆盖console.error
    if (currentConfig.errorTypes.consoleError) {
        const originalConsoleError = console.error;
        console.error = function(...args) {
            let errorType = 'console.error';
            let message = args.map(arg => String(arg)).join(' ');
            
            // 检查是否有Error对象
            const errorObj = args.find(arg => arg instanceof Error);
            if (errorObj) {
                errorType = errorObj.name;
                message = errorObj.message || message;
            }
            
            handleError({
                eventType: 'console.error',
                errorType: errorType,
                message: message
            });

            originalConsoleError.apply(console, args);
        };
    }
})();