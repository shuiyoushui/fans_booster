#!/usr/bin/env node

/**
 * 修复日志替换脚本导致的语法错误
 */

const fs = require('fs');
const path = require('path');

// 需要修复的模式
const fixes = [
  // 修复字符串拼接问题
  {
    pattern: /logError\('([^']+)',\s*({[^}]+})?\s*\)/g,
    replacement: (match, message, context) => {
      if (context) {
        // 处理对象参数
        return `logError('${message}', ${context});`;
      }
      return `logError('${message}');`;
    }
  },
  // 修复logInfo类似问题
  {
    pattern: /logInfo\('([^']+)',\s*({[^}]+})?\s*\)/g,
    replacement: (match, message, context) => {
      if (context) {
        return `logInfo('${message}', ${context});`;
      }
      return `logInfo('${message}');`;
    }
  },
  // 修复模板字符串问题
  {
    pattern: /logError\(`([^`]+)`(?:,\s*([^)]+))?\s*\)/g,
    replacement: (match, message, context) => {
      // 移除模板字符串中的+连接
      const cleanMessage = message.replace(/;\s*\+\s*`([^`]*)`/g, '$1');
      if (context) {
        return `logError(\`${cleanMessage}\`, ${context});`;
      }
      return `logError(\`${cleanMessage}\`);`;
    }
  }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // 应用修复
  fixes.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

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

// 主函数
function main() {
  console.log('🔧 正在修复日志语法错误...');
  
  const srcDir = path.join(__dirname, '../src');
  let fixedCount = 0;
  let totalCount = 0;
  
  walkDirectory(srcDir, (filePath) => {
    totalCount++;
    if (processFile(filePath)) {
      fixedCount++;
    }
  });
  
  console.log(`\n✅ 修复完成！`);
  console.log(`📊 统计信息:`);
  console.log(`   - 总文件数: ${totalCount}`);
  console.log(`   - 修复文件数: ${fixedCount}`);
}

// 运行脚本
main();