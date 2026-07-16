#!/usr/bin/env node
/**
 * check-docs-numbering.mjs - docs/ 编号铁律护栏。
 * @package  @vxture/repo
 * @layer    Infrastructure
 * @category guardrail
 * @description
 *   固化 docs/10-standards/docs-taxonomy.md 的元规则：编号=正式文件、无编号=临时(待删)。
 *   扫 docs/ 下每个 .md，非索引/非白名单且不匹配任一合法编号形态者 → 违规。
 *   迁移期默认 report 模式(列违规=工作单，exit 0)；迁移完成后 `--strict` 转硬门接 CI。
 *
 * @author AI-Generated
 * @date 2026-07-16
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";

const DOCS_ROOT = "docs";
const STRICT = process.argv.includes("--strict");

// 非 docs 正文的根级白名单（配置/入口类）。
const WHITELIST = new Set(["README.md"]);

// 合法「已编号」形态（其一即可）：
//   00-index.md / NN-slug.md      —— 目录内序列(十位跳，00 留给索引)
//   {kind}_{domain}_{NNN}_slug.md —— 域文档(百位分段)
//   ADR-NNN* / TD-NNN*            —— 类型寄存器
const NUMBERED = [
  /^\d{2}-.+\.md$/u, // NN-slug.md（含 00-index.md）
  /^(data|design|ops)_[a-z][a-z-]*_\d{3}_.+\.md$/u, // 域文档
  /^(ADR|TD)-\d{3}.*\.md$/u, // 寄存器
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function isNumbered(file) {
  const name = basename(file);
  if (WHITELIST.has(name)) return true;
  return NUMBERED.some((re) => re.test(name));
}

let files;
try {
  files = walk(DOCS_ROOT);
} catch {
  console.log(`[docs-numbering] no ${DOCS_ROOT}/ — skip`);
  process.exit(0);
}

const violations = files
  .filter((f) => !isNumbered(f))
  .map((f) => relative(".", f).replaceAll("\\", "/"))
  .sort();

if (violations.length === 0) {
  console.log(`[docs-numbering] OK — ${files.length} docs, all numbered.`);
  process.exit(0);
}

console.log(
  `[docs-numbering] ${violations.length} 未编号 .md（= 临时/待删或待编号，见 docs/10-standards/docs-taxonomy.md）:`,
);
for (const v of violations) console.log(`  ${v}`);

if (STRICT) {
  console.error(
    `\n[docs-numbering] STRICT: 未编号文件即违规——编号(NN-/域文档/ADR-·TD-)或删除。`,
  );
  process.exit(1);
}
console.log(`\n[docs-numbering] report 模式（迁移期，不阻断）。迁移完成后 --strict 接 CI。`);
process.exit(0);
