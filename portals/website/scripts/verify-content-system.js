#!/usr/bin/env node

/**
 * Content System 验证脚本
 * 用于快速验证内容系统是否正常工作
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前模块的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, "green");
}

function error(message) {
  log(`❌ ${message}`, "red");
}

function warning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function info(message) {
  log(`ℹ️  ${message}`, "blue");
}

// 验证配置
const checks = {
  files: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

// 检查文件是否存在
function checkFileExists(filePath, description) {
  checks.files++;
  const fullPath = path.join(__dirname, filePath);

  if (fs.existsSync(fullPath)) {
    success(`${description}: ${filePath}`);
    checks.passed++;
    return true;
  } else {
    error(`${description}: ${filePath}`);
    checks.failed++;
    return false;
  }
}

// 检查 JSON 文件语法
function checkJSONFile(filePath) {
  checks.files++;
  const fullPath = path.join(__dirname, filePath);

  try {
    if (!fs.existsSync(fullPath)) {
      error(`JSON 文件不存在: ${filePath}`);
      checks.failed++;
      return false;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const data = JSON.parse(content);

    // 验证必需字段
    if (!data.key) {
      warning(`缺少 key 字段: ${filePath}`);
      checks.warnings++;
    }

    if (typeof data.enabled !== "boolean") {
      warning(`缺少或无效的 enabled 字段: ${filePath}`);
      checks.warnings++;
    }

    success(`JSON 语法正确: ${filePath}`);
    checks.passed++;
    return true;
  } catch (err) {
    error(`JSON 语法错误: ${filePath} - ${err.message}`);
    checks.failed++;
    return false;
  }
}

// 检查中英文文件对齐
function checkI18nPair(key, subdir) {
  const zhFile = `public/data/${subdir}/${key}.zh-CN.json`;
  const enFile = `public/data/${subdir}/${key}.en-US.json`;

  info(`\n检查 ${key} 中英文对齐...`);

  const zhExists = checkFileExists(zhFile, "中文文件");
  const enExists = checkFileExists(enFile, "英文文件");

  if (zhExists && enExists) {
    checkJSONFile(zhFile);
    checkJSONFile(enFile);

    // 比较结构
    try {
      const zhData = JSON.parse(
        fs.readFileSync(path.join(__dirname, zhFile), "utf8"),
      );
      const enData = JSON.parse(
        fs.readFileSync(path.join(__dirname, enFile), "utf8"),
      );

      const zhKeys = Object.keys(zhData).sort();
      const enKeys = Object.keys(enData).sort();

      if (JSON.stringify(zhKeys) === JSON.stringify(enKeys)) {
        success(`结构对齐: ${key}`);
      } else {
        warning(`结构不对齐: ${key}`);
        console.log("  中文字段:", zhKeys.join(", "));
        console.log("  英文字段:", enKeys.join(", "));
        checks.warnings++;
      }
    } catch (err) {
      warning(`无法比较结构: ${err.message}`);
    }
  }
}

// 主验证流程
async function main() {
  log("\n🔍 开始验证 Content System...\n", "blue");

  // 1. 检查核心文件
  info("=== 检查核心文件 ===");
  checkFileExists("src/types/content.types.ts", "类型定义");
  checkFileExists("src/clients/contentClient.ts", "内容客户端");
  checkFileExists("src/clients/adapters/jsonAdapter.ts", "JSON 适配器");
  checkFileExists("src/services/contentService.ts", "内容服务");
  checkFileExists("src/hooks/useContent.ts", "useContent Hook");
  checkFileExists("src/hooks/useLocale.ts", "useLocale Hook");

  // 2. 检查文档
  info("\n=== 检查文档 ===");
  checkFileExists("CONTENT_SYSTEM_GUIDE.md", "使用指南");
  checkFileExists("CONTENT_SYSTEM_COMPLETE.md", "完成报告");
  checkFileExists(
    "src/components/examples/ContentUsageExamples.tsx",
    "使用示例",
  );

  // 3. 检查 JSON 数据文件
  info("\n=== 检查 JSON 数据文件 ===");

  // Layout 文件
  checkI18nPair("header", "layout");
  checkI18nPair("footer", "layout");

  // Sections 文件
  checkI18nPair("hero", "sections");
  checkI18nPair("features", "sections");
  checkI18nPair("solutions", "sections");
  checkI18nPair("cases", "sections");
  checkI18nPair("cta", "sections");

  // 4. 输出总结
  log("\n" + "=".repeat(50), "blue");
  log("验证结果总结", "blue");
  log("=".repeat(50), "blue");

  log(`\n总检查项: ${checks.files}`);
  success(`通过: ${checks.passed}`);

  if (checks.failed > 0) {
    error(`失败: ${checks.failed}`);
  }

  if (checks.warnings > 0) {
    warning(`警告: ${checks.warnings}`);
  }

  const successRate = ((checks.passed / checks.files) * 100).toFixed(1);
  log(`\n成功率: ${successRate}%`, successRate >= 90 ? "green" : "yellow");

  if (checks.failed === 0) {
    log("\n🎉 所有检查通过！Content System 已准备就绪。\n", "green");
    process.exit(0);
  } else {
    log("\n⚠️  部分检查失败，请修复后重试。\n", "yellow");
    process.exit(1);
  }
}

// 运行验证
main().catch((err) => {
  error(`验证过程出错: ${err.message}`);
  process.exit(1);
});
