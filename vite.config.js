import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// 复制文件的辅助函数
function copyRecursiveSync(source, target) {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  entries.forEach(entry => {
    const sourcePath = resolve(source, entry.name);
    const targetPath = resolve(target, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
      copyRecursiveSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// 执行 build-manifest.js 的函数 - 简化版
function runBuildManifest() {
  console.log('Running build-manifest.js to merge manifest configurations in output directory...');
  const { execSync } = require('child_process');
  const rootDir = process.cwd();
  const outputDir = resolve(rootDir, 'output');
  
  try {
    // 确保output目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 先复制根目录的manifest.json到output目录
    const rootManifest = resolve(rootDir, 'manifest.json');
    const outputManifest = resolve(outputDir, 'manifest.json');
    if (fs.existsSync(rootManifest)) {
      fs.copyFileSync(rootManifest, outputManifest);
    }
    
    // 创建一个简单的临时脚本，直接在output目录中运行build-manifest.js
    const tempScript = resolve(outputDir, 'run-manifest.js');
    const tempScriptContent = `
      const fs = require('fs');
      const path = require('path');
      const { execSync } = require('child_process');
      
      // 设置正确的工作目录
      const originalDir = path.dirname(process.cwd());
      process.chdir(originalDir);
      
      // 运行build-manifest.js，但指定输出到output目录
      const buildManifestPath = path.join(originalDir, 'build-manifest.js');
      const outputManifestPath = path.join(process.cwd(), 'output', 'manifest.json');
      
      try {
        console.log('Running build-manifest.js with output to', outputManifestPath);
        // 直接使用环境变量传递输出路径信息
        process.env.MANIFEST_OUTPUT_PATH = outputManifestPath;
        execSync('node ' + buildManifestPath, { stdio: 'inherit' });
        console.log('build-manifest.js completed successfully.');
      } catch (error) {
        console.error('Error running build-manifest.js:', error);
        process.exit(1);
      }
    `;
    
    // 写入临时脚本
    fs.writeFileSync(tempScript, tempScriptContent, 'utf8');
    
    // 运行临时脚本
    execSync(`node ${tempScript}`, { stdio: 'inherit' });
    
    // 清理临时脚本
    fs.unlinkSync(tempScript);
    
    console.log('Manifest merging completed successfully in output directory.');
  } catch (error) {
    console.error('Error running build-manifest.js:', error);
    throw error;
  }
}

// 构建前的钩子函数
function beforeBuild() {
  console.log('Preparing build...');
  // 现在不需要在构建前执行build-manifest.js，因为我们会在afterBuild中处理
}

// 构建后的钩子函数
function afterBuild() {
  console.log('Build completed, preparing extension files...');
  
  const rootDir = process.cwd();
  const outputDir = resolve(rootDir, 'output');
  
  // 复制其他插件相关文件
  const filesToCopy = [
    'manifest.json',
    'icons',
    'utils',
    'src',
    'feature.config.js',
    'features/js-error-monitor',
    'features/matechat'
  ];
  
  // 检查并复制env-configurator构建后的文件
  const envConfigDistDir = resolve(rootDir, 'features', 'env-configurator', 'dist');
  const envConfigTargetDir = resolve(outputDir, 'features', 'env-configurator');
  if (fs.existsSync(envConfigDistDir)) {
    if (!fs.existsSync(envConfigTargetDir)) {
      fs.mkdirSync(envConfigTargetDir, { recursive: true });
    }
    copyRecursiveSync(envConfigDistDir, envConfigTargetDir);
    console.log('Copied env-configurator build files.');
  } else {
    console.warn('env-configurator dist directory not found.');
  }
  
  filesToCopy.forEach(item => {
    const source = resolve(rootDir, item);
    const target = resolve(outputDir, item);
    if (fs.existsSync(source)) {
      if (fs.lstatSync(source).isDirectory()) {
        if (!fs.existsSync(target)) {
          fs.mkdirSync(target, { recursive: true });
        }
        copyRecursiveSync(source, target);
      } else {
        fs.copyFileSync(source, target);
      }
    }
  });
  
  console.log('All extension files have been copied to output directory.');
  
  // 执行build-manifest.js更新manifest
  console.log('Now running build-manifest.js to update manifest...');
  // runBuildManifest();
}

export default defineConfig({
  root: '.',
  build: {
    outDir: 'output',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // 指定background.js作为入口文件
        background: resolve(__dirname, 'src/background.js')
      },
      output: {
        // 保持目录结构
        preserveModules: false,
        manualChunks: undefined
      }
    }
  },
  plugins: [
    {
      name: 'extension-build-plugin',
      buildStart: beforeBuild,
      closeBundle: afterBuild
    }
  ]
});