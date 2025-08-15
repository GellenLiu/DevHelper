<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router';


defineProps<{ msg: string }>()

const objectList = ref([
    {
        key: 'window.service_cf3_config',
        configlist: [{
            key: 'ss',
            value: 'sad'
        }]
    }
])

const toggleState = ref(true);

const toggle = (value: boolean) => {

    toggleState.value = value;
};

// 在组件中使用路由
const router = useRouter();
const handleSettingClick = () => {
    console.log('点击了设置');
    // 使用Vue Router导航到config路由
    router.push('/config');
}

const getConfig = () => {
    (window as any).chrome?.runtime?.sendMessage({ action: "getEnvConfig" }, (response: any) => {
        if (response) {
            console.log(response)
        }
    });
}

onMounted(() => {
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
                <div class="object-list-item" v-for="object in objectList" :key="object.key">

                    <d-panel @toggle="toggle" :is-collapsed="true" :has-left-padding="false">
                        <d-panel-header>
                            <div class="config-title">
                                <span>{{ object.key }}</span>
                                <d-icon :style="{ transform: toggleState ? 'rotate(90deg)' : 'rotate(180deg)' }"
                                    name="icon-chevron-down-2"></d-icon>
                            </div>
                        </d-panel-header>
                        <d-panel-body>
                            <div class="config-list">
                                <div class="config-list-item" v-for="item in object.configlist" :key="item.key">
                                    <div class="config-list-item-left">
                                        <div class="config-list-item-left-title" title="{{ item.key }}">{{ item.key }}</div>

                                    </div>
                                    <div class="config-list-item-right">
                                        <d-input v-model="item.value" />
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

                 &:focus, &:active {
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
