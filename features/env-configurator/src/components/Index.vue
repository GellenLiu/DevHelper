<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router';
import { LocalStorageKey } from '../constant/common';

const configList: any = ref([])
const defaultVariable = ["window.service_cf3_config"];
const variables = ref<any>(defaultVariable);



const toggleState = ref(true);
const toggle = (value: boolean) => {
    toggleState.value = value;
};

// 在组件中使用路由
const router = useRouter();
const handleSettingClick = () => {
    // 在新窗口中打开配置页面
    if (window.chrome && (window as any).chrome.runtime) {
        const configUrl = (window as any).chrome?.runtime?.getURL('index.html#/config');
        window.open(configUrl, '_blank');
    } else {
        console.error('Chrome runtime is not available');
        // 降级方案：使用普通路由跳转
        router.push('/config');
    }
}

// 从chrome.storage.local获取配置的valiables
const getVariables = async () => {
    (window as any).chrome?.storage.local.get([LocalStorageKey.Variables], (result: any) => {
        if (result[LocalStorageKey.Variables]) {
            // 定义 variables ref 对象以解决找不到变量的问题
            variables.value = JSON.parse(result[LocalStorageKey.Variables]);
        }
    })
}

const getConfig = () => {
    console.log('getConfig', variables.value)
    const objects = variables.value || [];
    console.log('objects', objects);
    
    // 检查chrome对象是否可用
    if (!(window as any).chrome || !(window as any).chrome.runtime) {
        console.error('Chrome runtime is not available');
        return;
    }
    
    (window as any).chrome.tabs.query({active: true, currentWindow: true}, (tabs: any[]) => {
         // 获取当前标签页ID
         const tabId = tabs[0].id;
         
         // 向内容脚本发送消息
         (window as any).chrome.tabs.sendMessage(tabId, {
            action: "getEnvConfig", 
            objects
         }, (response: any) => {
            // 处理错误
            if ((window as any).chrome.runtime.lastError) {
                console.error('Message sending error:', (window as any).chrome.runtime.lastError);
                return;
            }
            
            if (response) {
                console.log('Received response:', response);
                configList.value = response;
            } else {
                console.log('No response received');
            }
         });
    });
}

onMounted(async () => {
    await getVariables();
    getConfig()
})

</script>

<template>
    <div class="container">
        <div class="header">
            <div class="first-button">
                <d-button variant="solid">应用配置</d-button>
            </div>
            <div class="button-wrapper">
                <d-button>刷新配置</d-button>
                <d-button @click="handleSettingClick">设置</d-button>

                <d-dropdown style="width: 100px;">
                    <d-button>更多</d-button>
                    <template #menu>
                        <ul class="list-menu">
                            <li class="menu-item">导入配置</li>
                            <li class="menu-item">复制配置</li>
                        </ul>
                    </template>
                </d-dropdown>
            </div>
        </div>
        <div class="content">
            <div class="object-list">
                <div class="object-list-item" v-for="(value, key) in configList" :key="key">

                    <d-panel @toggle="toggle" :is-collapsed="true" :has-left-padding="false">
                        <d-panel-header>
                            <div class="config-title">
                                <span>{{ key }}</span>
                                <d-icon :style="{ transform: toggleState ? 'rotate(90deg)' : 'rotate(180deg)' }"
                                    name="icon-chevron-down-2"></d-icon>
                            </div>
                        </d-panel-header>
                        <d-panel-body>
                            <div class="config-list">
                                <div class="config-list-item" v-for="(_, itemKey) in value" :key="itemKey">
                                    <div class="config-list-item-left">
                                        <div class="config-list-item-left-title" title="{{ itemKey }}">{{ itemKey }}
                                        </div>
                                    </div>
                                    <div class="config-list-item-right">
                                        <d-input v-model="value[itemKey]" />

                                    </div>
                                </div>
                            </div>
                        </d-panel-body>
                    </d-panel>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.container {
    width: 100%;
    height: 100%;

    .first-button {
        display: flex;
        justify-content: flex-end;
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
</style>
