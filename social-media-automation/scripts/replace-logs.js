#!/usr/bin/env node

/**
 * 自动替换console.error为结构化日志的脚本
 */

const fs = require('fs');
const path = require('path');

// 需要处理的目录
const srcDir = path.join(__dirname, '../src');

// 要替换的模式
const replacements = [
  {
    pattern: /console\.error\(\s*['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\s*\)/g,
    replacement: (match, message, context) => {
      const contextStr = context ? context.trim() : 'undefined';
      return `logError('${message}', ${contextStr});`;
    }
  },
  {
    pattern: /console\.error\(([^,]+),\s*([^)]+)\)/g,
    replacement: (match, message, context) => {
      return `logError(${message}, ${context});`;
    }
  },
  {
    pattern: /console\.log\(\s*['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\s*\)/g,
    replacement: (match, message, context) => {
      const contextStr = context ? context.trim() : 'undefined';
      return `logInfo('${message}', ${contextStr});`;
    }
  },
  {
    pattern: /console\.info\(\s*['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\s*\)/g,
    replacement: (match, message, context) => {
      const contextStr = context ? context.trim() : 'undefined';
      return `logInfo('${message}', ${contextStr});`;
    }
  },
  {
    pattern: /console\.warn\(\s*['"`]([^'"`]+)['"`](?:,\s*([^)]+))?\s*\)/g,
    replacement: (match, message, context) => {
      const contextStr = context ? context.trim() : 'undefined';
      return `logger.warn('${message}', ${contextStr});`;
    }
  }
];

// 需要添加import的文件
const filesNeedingImport = new Set();

// 递归遍历目录
function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath, callback);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      callback(filePath);
    }
  }
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 跳过已经处理过的文件
  if (content.includes("import { logError, logInfo }") || 
      content.includes("import { logger }")) {
    return false;
  }
  
  const originalContent = content;
  
  // 应用所有替换规则
  replacements.forEach(({ pattern, replacement }) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (before !== content) {
      modified = true;
      // 检查是否需要添加import
      if (pattern.toString().includes('error')) {
        filesNeedingImport.add(filePath);
      }
    }
  });
  
  // 如果文件被修改了，添加必要的import
  if (modified) {
    // 添加import语句在文件开头
    const importStatement = "import { logError, logInfo, logger } from '@/lib/logger';\n";
    
    // 查找第一个import或'use client'的位置
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line === "'use client';" || line.startsWith('///')) {
        insertIndex = i + 1;
      } else if (line.startsWith('export ')) {
        insertIndex = i;
        break;
      } else if (line && !line.startsWith('//') && !line.startsWith('*')) {
        insertIndex = i;
        break;
      }
    }
    
    lines.splice(insertIndex, 0, importStatement);
    content = lines.join('\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Modified: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

// 主函数
function main() {
  console.log('🔍 正在搜索并替换console调用...');
  
  let modifiedCount = 0;
  let totalCount = 0;
  
  walkDirectory(srcDir, (filePath) => {
    totalCount++;
    if (processFile(filePath)) {
      modifiedCount++;
    }
  });
  
  console.log(`\n✅ 处理完成！`);
  console.log(`📊 统计信息:`);
  console.log(`   - 总文件数: ${totalCount}`);
  console.log(`   - 修改文件数: ${modifiedCount}`);
  
  if (modifiedCount > 0) {
    console.log(`\n📝 注意事项:`);
    console.log(`   - 已自动添加日志import语句`);
    console.log(`   - 请检查修改后的文件确保功能正常`);
    console.log(`   - 建议运行测试确保没有破坏性变更`);
  }
}

// 运行脚本
main();