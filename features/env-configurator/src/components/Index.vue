<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router';
import { LocalStorageKey } from '../constant/common';
import { Message } from 'vue-devui';

// 格式化输入值显示
const formatValue = (value: any) => {
    if (typeof value === 'string') {
        // 字符串类型添加引号
        return `'${value}'`;
    } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        // 数组和对象类型序列化为JSON
        return JSON.stringify(value, null, 2);
    } else {
        // 其他类型保持原样
        return value;
    }
};

// 处理输入变化
const handleInputChange = (event: any, value: any, itemKey: string | number) => {
    let inputValue = event;
    try {
        // 检查是否为带引号的字符串
        if ((inputValue.startsWith('"') && inputValue.endsWith('"')) ||
            (inputValue.startsWith('\'') && inputValue.endsWith('\''))) {
            // 去除引号
            if (getObjectType(value) === 'object') {
                value = inputValue.slice(1, -1);
            }
            value[itemKey] = inputValue.slice(1, -1);
        }
        // 检查是否为JSON对象或数组
        else if ((inputValue.startsWith('{') && inputValue.endsWith('}')) ||
            (inputValue.startsWith('[') && inputValue.endsWith(']'))) {
            // 尝试解析JSON
            value[itemKey] = JSON.parse(inputValue);
        }
        // 检查是否为数字
        else if (!isNaN(inputValue) && inputValue.trim() !== '') {
            value[itemKey] = Number(inputValue);
        }
        // 检查是否为布尔值
        else if (inputValue.toLowerCase() === 'true') {
            value[itemKey] = true;
        }
        else if (inputValue.toLowerCase() === 'false') {
            value[itemKey] = false;
        }
        // 空值处理
        else if (inputValue.trim() === '') {
            value[itemKey] = '';
        }
        // 默认为字符串
        else {
            value[itemKey] = inputValue;
        }
    } catch (error) {
        Message.error('输入解析失败，请检查格式');
    }
};

// 导入配置函数
const handleImportClick = () => {
    // 创建一个输入文件元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    // 监听文件选择事件
    input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();

            // 读取文件内容
            reader.onload = (event: any) => {
                try {
                    // 解析JSON内容
                    const importedConfig = JSON.parse(event.target.result);
                    // 更新配置列表
                    configList.value = importedConfig;
                    Message.success('配置导入成功');
                } catch (error) {
                    Message.error('配置导入失败：无效的JSON格式');
                }
            };

            reader.readAsText(file);
        }
    };

    // 触发文件选择对话框
    input.click();
};

// 复制配置函数
const handleCopyClick = () => {
    // 将配置列表转换为格式化的JSON字符串
    const configStr = JSON.stringify(configList.value, null, 2);

    // 使用Clipboard API复制文本
    navigator.clipboard.writeText(configStr)
        .then(() => {
            Message.success('已复制到剪贴板');

        })
        .catch((_) => {
            Message.error('复制配置失败');
        });
};


const configList: any = ref([])
const defaultVariable = ["window.service_cf3_config"];
const variables = ref<any>(defaultVariable);
const configListPanelToggleMap = ref<any>({})

const applyPreset = (preset: any) => {
    variables.value = preset.variables;
}


// 发送消息给content.js
const applyConfig = () => {
    (window as any).chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        // 获取当前标签页ID
        const tabId = tabs[0].id;

        // 向内容脚本发送消息
        (window as any).chrome.tabs.sendMessage(tabId, {
            action: 'applyConfig',
            config: configList.value
        }, (response: any) => {
            // 处理错误
            if ((window as any).chrome.runtime.lastError) {
                return;
            }

            if (response) {
                Message.success('配置应用成功');
            }
        });
    });
}


const toggleState = ref(true);
const handleSwitchChange = (value: boolean) => {
    toggleState.value = value;
    (window as any).chrome?.storage.local.set({
        [LocalStorageKey.Switch]: value,
    })
};

// 在组件中使用路由
const router = useRouter();
const handleSettingClick = () => {
    // 在新窗口中打开配置页面
    if (window.chrome && (window as any).chrome.runtime) {
        const configUrl = (window as any).chrome?.runtime?.getURL('index.html#/config');
        window.open(configUrl, '_blank');
    } else {
        // 降级方案：使用普通路由跳转
        router.push('/config');
    }
}

// 从chrome.storage.local获取配置的valiables
const getVariables = async () => {
    return new Promise((resolve, reject) => {
        (window as any).chrome?.storage.local.get([LocalStorageKey.Variables], (result: any) => {
            if (result[LocalStorageKey.Variables]) {
                // 定义 variables ref 对象以解决找不到变量的问题
                variables.value = JSON.parse(result[LocalStorageKey.Variables]);
                resolve(variables.value);
            } else {
                reject('获取变量失败');
            }
        })
    })
}

const getSwitchState = async () => {
    (window as any).chrome?.storage.local.get([LocalStorageKey.Switch], (result: any) => {
        if (result[LocalStorageKey.Switch]) {
            // 定义 variables ref 对象以解决找不到变量的问题
            toggleState.value = JSON.parse(result[LocalStorageKey.Switch]);
        }
    })
}

const preSettings = ref()
const getPreSettings = async () => {
    (window as any).chrome?.storage.local.get([LocalStorageKey.Presets], (result: any) => {
        if (result[LocalStorageKey.Presets]) {
            // 定义 variables ref 对象以解决找不到变量的问题
            preSettings.value = JSON.parse(result[LocalStorageKey.Presets]);
        }
    })
}


const getConfig = () => {
    const objects = variables.value || [];

    // 检查chrome对象是否可用
    if (!(window as any).chrome || !(window as any).chrome.runtime) {
        return;
    }

    (window as any).chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        // 获取当前标签页ID
        const tabId = tabs[0].id;

        // 向内容脚本发送消息
        (window as any).chrome.tabs.sendMessage(tabId, {
            action: "getEnvConfig",
            objects
        }, (response: any) => {
            // 处理错误
            if ((window as any).chrome.runtime.lastError) {
                return;
            }

            if (response) {
                console.log('response', response);

                configList.value = response;
            } else {
                Message.error('获取配置失败');
            }
        });
    });
}

const getObjectType = (obj: any) => {
    return typeof obj;

}


onMounted(async () => {
    await getSwitchState();
    await getVariables();
    await getPreSettings();
    getConfig()
})

</script>

<template>
    <div class="container">
        <div class="header">
            <div class="first-button">
                <div class="switch-wrapper">
                    <d-switch v-model="toggleState" @change="handleSwitchChange" />

                    <span>{{ toggleState ? '开启' : '关闭' }}</span>
                </div>
                <div>
                    <d-button-group>
                        <d-button variant="solid" @click="applyConfig">
                            应用配置
                        </d-button>
                    </d-button-group>
                </div>
            </div>
            <div class="button-wrapper">
                <d-button size="sm" @click="getConfig">刷新配置</d-button>
                <d-dropdown>
                    <d-button size="sm">导入配置</d-button>
                    <template #menu>
                        <div class="menu-item" @click="handleImportClick">选择文件导入</div>
                        <ul class="list-menu">
                            <li class="menu-item" v-for="(item, index) in preSettings" :key="index"
                                @click="applyPreset(item)">
                                使用预设配置 {{ item.name }}
                            </li>
                        </ul>
                    </template>
                </d-dropdown>
                <d-button size="sm" @click="handleCopyClick">复制配置</d-button>
                <d-button @click="handleSettingClick" size="sm">设置</d-button>

            </div>
        </div>
        <div class="content">
            <div class="object-list">
                <div class="object-list-item" v-for="(value, key) in configList" :key="value[key]">
                    <d-panel :is-collapsed="true" :has-left-padding="false">
                        <d-panel-header>
                            <div class="config-title">
                                <span>{{ key }}</span>
                                <d-icon
                                    :style="{ transform: configListPanelToggleMap[key] ? 'rotate(90deg)' : 'rotate(180deg)' }"
                                    name="icon-chevron-down-2"></d-icon>
                            </div>
                        </d-panel-header>
                        <d-panel-body>
                            <div class="config-list">
                                <div v-if="getObjectType(value) !== 'object'">
                                    <div class="config-list-item">
                                        <div class="config-list-item-left">
                                            <div class="config-list-item-left-title" title="{{ key }}">{{ key }}
                                            </div>
                                        </div>
                                        <div class="config-list-item-right">
                                            <d-input :value="formatValue(value)"
                                                @change="handleInputChange($event, value, key)" />
                                        </div>
                                    </div>
                                </div>
                                <div v-if="getObjectType(value) === 'object'">
                                    <div class="config-list-item" v-for="(_, itemKey) in value" :key="value[itemKey]">

                                        <div class="config-list-item-left">
                                            <div class="config-list-item-left-title" title="{{ itemKey }}">{{ itemKey }}
                                            </div>
                                        </div>
                                        <div class="config-list-item-right">
                                            <d-input :value="formatValue(value[itemKey])"
                                                @change="handleInputChange($event, value, itemKey)" />
                                        </div>
                                    </div>
                                </div>

                                <div v-if="value.length === 0">
                                    <div class="no-config">
                                        <div class="no-config-text">
                                            暂无配置
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </d-panel-body>
                    </d-panel>
                </div>
                <div v-if="configList.length === 0">
                    <div class="no-config">
                        <div class="no-config-text">
                            暂无配置
                            <span class="devui-link" @click="handleSettingClick">前往设置</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.container {
    width: 100%;
    height: 100%;
    padding: 12px;

    .content {
        max-height: 500px;
        overflow: auto;
    }

    .first-button {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
    }

    .button-wrapper {
        display: flex;
        margin-bottom: 8px;
        gap: 8px;
    }

    :deep(.devui-panel) {
        .devui-panel-heading {
            padding: 0;
            background: transparent;
        }

        .devui-panel-content {
            padding: 0;
        }

        .devui-panel-body {
            border-top: none;
        }
    }

    .config-title {
        display: flex;
        align-items: center;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        text-align: left;

        span {
            margin-right: 4px;
        }
    }

    .config-list-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        .config-list-item-left {
            width: 100px;
            margin-right: 8px;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .config-list-item-right {
            flex: 1;

            .devui-input--focus {
                border-bottom: 1px solid #007aff !important;
            }

            :deep(.devui-input__wrapper) {
                border: none;
                box-shadow: none !important;
                border-bottom: 1px solid #d7d8da;

                &:hover {
                    border-bottom: 1px solid #007aff;
                }

                &:focus,
                &:active {
                    border-bottom: 1px solid #007aff !important;
                }

            }
        }
    }
}

.list-menu {
    padding: 0;
    margin: 0;
    width: 100px;
}

.switch-wrapper {
    display: flex;
    align-items: center;

    .devui-switch {
        margin-right: 4px;
    }
}

.menu-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100px;
    padding: 4px;
    cursor: pointer;
}

.menu-item:hover {
    background-color: var(--devui-list-item-hover-bg, #f2f5fc);
    color: var(--devui-list-item-hover-text, #526ecc);
}

.no-config {
    margin-top: 40px;
    margin-bottom: 40px;
}
</style>
