const fs = require('fs');
const path = require('path');

// 读取主 manifest.json 文件 - 支持从环境变量获取输出路径
const defaultManifestPath = path.join(__dirname, 'manifest.json');
const outputManifestPath = process.env.MANIFEST_OUTPUT_PATH || defaultManifestPath;
const mainManifestPath = process.env.MANIFEST_OUTPUT_PATH ? 
  // 如果指定了输出路径，读取原始manifest
  defaultManifestPath : 
  // 否则使用默认路径
  defaultManifestPath;

let mainManifest = JSON.parse(fs.readFileSync(mainManifestPath, 'utf8'));

// 备份原始配置
const originalContentScripts = [...(mainManifest.content_scripts || [])];
const originalWebAccessibleResources = [...(mainManifest.web_accessible_resources || [])];
const originalCommands = {...(mainManifest.commands || {})};

// 清空 content_scripts 和 web_accessible_resources 数组
mainManifest.content_scripts = [];
mainManifest.web_accessible_resources = [];
mainManifest.commands = {...originalCommands}; // 保留原始commands

// 自动扫描 features 目录下的所有 manifest.json 文件
const featuresDir = path.join(__dirname, 'features');
console.log('Scanning for feature manifests in:', featuresDir);

// 递归扫描目录函数
function scanFeatures(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const manifestPaths = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 递归扫描子目录
      manifestPaths.push(...scanFeatures(fullPath));
    } else if (entry.name === 'manifest.json') {
      // 找到 manifest.json 文件
      manifestPaths.push(fullPath);
    }
  }
  
  return manifestPaths;
}

// 扫描所有 feature manifest 文件
const featureManifestPaths = scanFeatures(featuresDir);
console.log(`Found ${featureManifestPaths.length} feature manifests...`);

// 处理每个找到的 manifest 文件
featureManifestPaths.forEach(fullPath => {
  try {
      console.log(`Reading feature manifest: ${fullPath}`);
      const featureManifest = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      // 提取 content_scripts 配置
      if (featureManifest.content_scripts && Array.isArray(featureManifest.content_scripts)) {
        console.log(`Found ${featureManifest.content_scripts.length} content scripts in ${fullPath}`);
        featureManifest.content_scripts.forEach(script => {
          // 调整 js 文件路径为相对路径
          if (script.js && Array.isArray(script.js)) {
            script.js = script.js.map(jsPath => {
              const absolutePath = path.join(path.dirname(fullPath), jsPath);
              // 移除项目根目录，得到相对路径
              const relativePath = absolutePath.replace(__dirname + path.sep, '').replace(/\\/g, '/');
              return relativePath;
            });
            console.log(`Adjusted JS paths: ${script.js}`);
          }
          mainManifest.content_scripts.push(script);
        });
      }

      // 提取 web_accessible_resources 配置
      if (featureManifest.web_accessible_resources && Array.isArray(featureManifest.web_accessible_resources)) {
        console.log(`Found ${featureManifest.web_accessible_resources.length} web accessible resources in ${fullPath}`);
        featureManifest.web_accessible_resources.forEach(resource => {
          // 调整 resources 文件路径为相对路径
          if (resource.resources && Array.isArray(resource.resources)) {
            resource.resources = resource.resources.map(resPath => {
              const absolutePath = path.join(path.dirname(fullPath), resPath);
              // 移除项目根目录，得到相对路径
              const relativePath = absolutePath.replace(__dirname + path.sep, '').replace(/\\/g, '/');
              return relativePath;
            });
            console.log(`Adjusted resource paths: ${resource.resources}`);
          }
          mainManifest.web_accessible_resources.push(resource);
        });
      }

      // 提取 commands 配置
      if (featureManifest.commands && typeof featureManifest.commands === 'object') {
        console.log(`Found commands in ${fullPath}`);
        // 合并 commands
        mainManifest.commands = {
          ...mainManifest.commands,
          ...featureManifest.commands
        };
        console.log(`Merged commands: ${Object.keys(featureManifest.commands).join(', ')}`);
      }
    } catch (error) {
      console.error(`Error reading feature manifest: ${fullPath}`, error);
      // 如果出错，恢复原始配置
      mainManifest.content_scripts = originalContentScripts;
      mainManifest.web_accessible_resources = originalWebAccessibleResources;
    }
  });

// 添加额外的 web_accessible_resources
const additionalResources = [
  'utils/json-loader.js',
  'feature.config.js'
];

if (mainManifest.web_accessible_resources && Array.isArray(mainManifest.web_accessible_resources) && mainManifest.web_accessible_resources.length > 0) {
  // 将额外资源添加到第一个资源组
  mainManifest.web_accessible_resources[0].resources = [...mainManifest.web_accessible_resources[0].resources, ...additionalResources];
} else {
  // 如果没有资源组，创建一个新的
  mainManifest.web_accessible_resources = [{
    resources: additionalResources,
    matches: ['<all_urls>']
  }];
}

// 写入更新后的主 manifest.json 文件
console.log(`Updating main manifest with ${mainManifest.content_scripts.length} content scripts and ${mainManifest.web_accessible_resources.length} web accessible resources`);
console.log(`Writing manifest to: ${outputManifestPath}`);
fs.writeFileSync(outputManifestPath, JSON.stringify(mainManifest, null, 2), 'utf8');
console.log('Main manifest.json has been updated with features configurations.');

// 显示更新后的配置
// 处理background.js路径 - 从src/background.js改为background.js
// 这是因为Vite构建后文件会直接放在output目录下
if (mainManifest.background && mainManifest.background.service_worker) {
  if (mainManifest.background.service_worker.startsWith('src/')) {
    mainManifest.background.service_worker = mainManifest.background.service_worker.replace('src/', '');
    console.log(`Updated background service worker path to: ${mainManifest.background.service_worker}`);
  }
}

console.log('Updated content_scripts:', JSON.stringify(mainManifest.content_scripts, null, 2));
console.log('Updated web_accessible_resources:', JSON.stringify(mainManifest.web_accessible_resources, null, 2));
console.log('Updated background:', JSON.stringify(mainManifest.background, null, 2));
