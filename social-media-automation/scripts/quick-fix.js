#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 修复所有分号问题
function fixSemicolonIssue(content) {
  return content.replace(/\.substring\(\d+,\s*\d+\)\;\s*\+\s*'([^']+)'/g, '.substring($1, $2) + \'$3\'');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  content = fixSemicolonIssue(content);
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

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

const srcDir = path.join(__dirname, '../src');
let fixedCount = 0;

walkDirectory(srcDir, (filePath) => {
  if (processFile(filePath)) {
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);