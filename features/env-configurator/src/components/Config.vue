<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Message } from 'vue-devui';
import { LocalStorageKey } from '../constant/common';

// 扩展Window接口，添加chrome属性声明
declare global {
  interface Window {
    chrome?: {
      storage?: {
        local?: {
          get: (keys: string[] | null, callback: (items: {[key: string]: any}) => void) => void;
          set: (items: {[key: string]: any}, callback?: () => void) => void;
        }
      }
    }
  }
}

// 定义Chrome存储类型接口
interface ChromeStorage {
  [key: string]: string[] | PresetConfig[] | undefined;
}

// 预设配置接口
interface PresetConfig {
  id: string;
  name: string;
  domains: string[];
  variables: string[];
}

// 定义响应式变量
const domain = ref('');
const domains = ref<string[]>([]);
const variablePath = ref('');
const variables = ref<string[]>([]);
const presets = ref<PresetConfig[]>([]);
const currentView = ref('domains'); // 当前视图: domains, variables, presets

// 从Chrome存储加载配置
function loadConfigs() {
  try {
    const chrome = window.chrome;
    if (!chrome?.storage?.local) {
      throw new Error('Chrome storage API is not available');
    }

    chrome.storage.local.get([LocalStorageKey.Domains, LocalStorageKey.Variables, LocalStorageKey.Presets], function (result: ChromeStorage) {
      if (result[LocalStorageKey.Domains as keyof ChromeStorage] && Array.isArray(result[LocalStorageKey.Domains as keyof ChromeStorage])) {
        domains.value = result[LocalStorageKey.Domains as keyof ChromeStorage] as string[];
      }
      if (result[LocalStorageKey.Variables as keyof ChromeStorage] && Array.isArray(result[LocalStorageKey.Variables as keyof ChromeStorage])) {
        variables.value = result[LocalStorageKey.Variables as keyof ChromeStorage] as string[];
      }
      if (result[LocalStorageKey.Presets as keyof ChromeStorage] && Array.isArray(result[LocalStorageKey.Presets as keyof ChromeStorage])) {
        presets.value = result[LocalStorageKey.Presets as keyof ChromeStorage] as PresetConfig[];
      }
    });
  } catch (e) {
    Message.error('加载配置失败');
  }
}

// 保存配置到Chrome存储
function saveConfigs() {
  try {
    const chrome = window.chrome;
    if (!chrome?.storage?.local) {
      throw new Error('Chrome storage API is not available');
    }

    chrome.storage.local.set({
      [LocalStorageKey.Domains]: JSON.stringify(domains.value),
      [LocalStorageKey.Variables]: JSON.stringify(variables.value),
      [LocalStorageKey.Presets]: JSON.stringify(presets.value)
    }, function () {
      Message.success('配置已保存');
    });
  } catch (e) {
    Message.error('保存配置失败');
  }
}

// 查看预设配置
function viewPreset(id: string) {
  const preset = presets.value.find(p => p.id === id);
  if (preset) {
    // 可以在这里实现查看预设的逻辑，比如弹出详情对话框或切换到编辑视图
    console.log('查看预设:', preset);
    // 示例：显示预设详情
    alert(`预设名称: ${preset.name}\n域名数量: ${preset.domains.length}\n变量数量: ${preset.variables.length}`);
  }
}

// 删除预设配置
function deletePreset(id: string) {
  if (confirm('确定要删除这个预设吗？')) {
    presets.value = presets.value.filter(p => p.id !== id);
    saveConfigs();
    Message.success('预设已删除');
  }
}

// 添加域名
function addDomain() {
  const domainValue = domain.value.trim();
  if (!domainValue) {
    Message.error('请输入域名');
    return;
  }

  if (domains.value.includes(domainValue)) {
    Message.error('该域名已存在');
    return;
  }

  domains.value.push(domainValue);
  domain.value = '';
  saveConfigs();
}

// 删除域名
function removeDomain(item: string) {
  domains.value = domains.value.filter(d => d !== item);
  saveConfigs();
}

// 添加变量路径
function addVariable() {
  const pathValue = variablePath.value.trim();
  if (!pathValue) {
    Message.error('请输入变量路径');
    return;
  }

  if (variables.value.includes(pathValue)) {
    Message.error('该变量路径已存在');
    return;
  }

  // 简单的变量路径验证
  const pathRegex = /^window(\.[a-zA-Z0-9_]+)+$/;
  if (!pathRegex.test(pathValue)) {
    Message.error('请输入有效的变量路径格式（例如：window.service_cf3_config）');
    return;
  }

  variables.value.push(pathValue);
  variablePath.value = '';
  saveConfigs();
}

// 删除变量路径
function removeVariable(item: string) {
  variables.value = variables.value.filter(v => v !== item);
  saveConfigs();
}

// 切换视图
function switchView(view: string) {
  currentView.value = view;
}

// 页面加载时加载配置
onMounted(() => {
  loadConfigs();
});

// 定义props
defineProps<{ msg?: string }>();
</script>

<template>
  <div class="config-container">
    <h1 class="config-title">Env Configurator 插件配置</h1>
    <!-- 选项卡切换 -->
    <div class="tabs">
      <button
        :class="{ 'active': currentView === 'domains' }"
        @click="switchView('domains')"
      >
        域名配置
      </button>
      <button
        :class="{ 'active': currentView === 'variables' }"
        @click="switchView('variables')"
      >
        劫持变量配置
      </button>
      <button
        :class="{ 'active': currentView === 'presets' }"
        @click="switchView('presets')"
      >
        预设配置导入
      </button>
    </div>

    <!-- 域名配置部分 -->
    <div v-if="currentView === 'domains'" class="config-section">
      <h2>域名配置</h2>
      <div class="input-group">
        <d-input
          v-model="domain"
          placeholder="请输入域名（例如：api.example.com）"
        />
        <d-button type="primary" @click="addDomain" >添加</d-button>
      </div>
      <!-- 已配置域名列表 -->
      <div class="list-container">
        <div class="list-header">已配置的域名</div>
        <div class="domain-list">
          <div v-if="domains.length === 0" class="empty-state">暂无配置的域名</div>
          <div v-for="item in domains" :key="item" class="domain-item">
            <div class="domain-name">{{ item }}</div>
            <d-button type="danger" @click="removeDomain(item)" size="small">删除</d-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 变量路径配置 -->
    <div v-else-if="currentView === 'variables'" class="config-section">
      <h2>劫持变量配置</h2>
      <div class="input-group">
        <d-input
          v-model="variablePath"
          placeholder="请输入变量路径（例如：window.service_cf3_config）"
        />
        <d-button type="primary" @click="addVariable">添加</d-button>
      </div>
      <!-- 已配置变量列表 -->
      <div class="list-container">
        <div class="list-header">已配置的变量</div>
        <div class="domain-list">
          <div v-if="variables.length === 0" class="empty-state">暂无配置的变量</div>
          <div v-for="item in variables" :key="item" class="domain-item">
            <div class="domain-name">{{ item }}</div>
            <d-button type="danger" @click="removeVariable(item)" size="small">删除</d-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 预设数据配置 -->
    <div v-else-if="currentView === 'presets'" class="config-section">
      <h2>预设配置导入</h2>
      <div class="list-container">
        <div class="list-header">预设配置</div>
        <div class="domain-list">
          <div v-if="presets.length === 0" class="empty-state">暂无预设方案</div>
          <div v-for="item in presets" :key="item.id" class="domain-item">
            <div class="domain-name">{{ item.name }}</div>
            <d-button type="primary" @click="viewPreset(item.id)" size="small">查看</d-button>
            <d-button type="danger" @click="deletePreset(item.id)" size="small">删除</d-button>
          </div>
        </div>
      </div>
      <div class="import-section">
        <d-button type="primary">导入预设配置</d-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-container {
  max-width: 800px;
  min-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: left;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.config-title {
  color: #333;
  font-size: 24px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.tabs button {
  padding: 10px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tabs button.active {
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
  font-weight: 500;
}

.tabs button:hover:not(.active) {
  color: #1890ff;
  border-bottom: 2px solid #e6f7ff;
}

.config-section {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.config-section h2 {
  color: #333;
  font-size: 18px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input-group .d-input {
  flex: 1;
}

.list-container {
  margin-top: 20px;
}

.list-header {
  font-weight: 500;
  color: #666;
  margin-bottom: 10px;
  padding-left: 5px;
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 5px;
}

.domain-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s;
}

.domain-item:hover {
  background-color: #f5f7fa;
}

.domain-name {
  font-size: 14px;
  color: #333;
  word-break: break-all;
  flex: 1;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: #999;
  background-color: #fff;
  border-radius: 4px;
  border: 1px dashed #e8e8e8;
}

.error-message {
  background-color: #fff2f0;
  color: #f5222d;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  animation: fadeInOut 3s;
  border: 1px solid #ffccc7;
}

.success-message {
  background-color: #f0fff4;
  color: #52c41a;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  animation: fadeInOut 3s;
  border: 1px solid #b7eb8f;
}

.import-section {
  margin-top: 20px;
  text-align: right;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  90% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

/* 适配深色模式 */
@media (prefers-color-scheme: dark) {
  .config-container {
    background-color: #1f2937;
    color: #f9fafb;
  }

  .config-title,
  .config-section h2,
  .domain-name,
  .list-header {
    color: #f9fafb;
  }

  .config-section {
    background-color: #374151;
  }

  .error-message {
    background-color: #4b1818;
    border-color: #7f1d1d;
  }

  .success-message {
    background-color: #184b18;
    border-color: #1d7f1d;
  }

  .tabs button {
    color: #d1d5db;
  }

  .tabs button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .domain-item {
    background-color: #374151;
  }

  .domain-item:hover {
    background-color: #4b5563;
  }

  .empty-state {
    background-color: #2d3748;
    color: #9ca3af;
    border-color: #4b5563;
  }
}
</style>
