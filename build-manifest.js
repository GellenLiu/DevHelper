const fs = require('fs');
const path = require('path');

// 读取主 manifest.json 文件
const mainManifestPath = path.join(__dirname, 'manifest.json');
let mainManifest = JSON.parse(fs.readFileSync(mainManifestPath, 'utf8'));

// 备份原始配置
const originalContentScripts = [...(mainManifest.content_scripts || [])];
const originalWebAccessibleResources = [...(mainManifest.web_accessible_resources || [])];

// 清空 content_scripts 和 web_accessible_resources 数组
mainManifest.content_scripts = [];
mainManifest.web_accessible_resources = [];

// 读取 features 数组中指定的所有功能 manifest.json 文件
if (mainManifest.features && Array.isArray(mainManifest.features)) {
  console.log(`Processing ${mainManifest.features.length} feature manifests...`);
  mainManifest.features.forEach(featurePath => {
    const fullPath = path.join(__dirname, featurePath);
    try {
      console.log(`Reading feature manifest: ${fullPath}`);
      const featureManifest = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      // 提取 content_scripts 配置
      if (featureManifest.content_scripts && Array.isArray(featureManifest.content_scripts)) {
        console.log(`Found ${featureManifest.content_scripts.length} content scripts in ${featurePath}`);
        featureManifest.content_scripts.forEach(script => {
          // 调整 js 文件路径
          if (script.js && Array.isArray(script.js)) {
            script.js = script.js.map(jsPath => path.join(path.dirname(featurePath), jsPath).replace(/\\/g, '/'));
            console.log(`Adjusted JS paths: ${script.js}`);
          }
          mainManifest.content_scripts.push(script);
        });
      }

      // 提取 web_accessible_resources 配置
      if (featureManifest.web_accessible_resources && Array.isArray(featureManifest.web_accessible_resources)) {
        console.log(`Found ${featureManifest.web_accessible_resources.length} web accessible resources in ${featurePath}`);
        featureManifest.web_accessible_resources.forEach(resource => {
          // 调整 resources 文件路径
          if (resource.resources && Array.isArray(resource.resources)) {
            resource.resources = resource.resources.map(resPath => path.join(path.dirname(featurePath), resPath).replace(/\\/g, '/'));
            console.log(`Adjusted resource paths: ${resource.resources}`);
          }
          mainManifest.web_accessible_resources.push(resource);
        });
      }
    } catch (error) {
      console.error(`Error reading feature manifest: ${fullPath}`, error);
      // 如果出错，恢复原始配置
      mainManifest.content_scripts = originalContentScripts;
      mainManifest.web_accessible_resources = originalWebAccessibleResources;
    }
  });
}

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
fs.writeFileSync(mainManifestPath, JSON.stringify(mainManifest, null, 2), 'utf8');
console.log('Main manifest.json has been updated with features configurations.');

// 显示更新后的配置
console.log('Updated content_scripts:', JSON.stringify(mainManifest.content_scripts, null, 2));
console.log('Updated web_accessible_resources:', JSON.stringify(mainManifest.web_accessible_resources, null, 2));