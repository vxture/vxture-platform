// ═══════════════════════════════════════════════════════════════════════════
// check-i18n-keys.mjs — i18n 伴生键列静态检查器（data_platform_100 §3.2.5）
//
// 规则：系统目录表的外显字段（name/title/label/description 类）必须有伴生
//   `{字段}_key` 列。规则单位 = 字段，不是表——2026-07-05 教训：permission 表
//   因"有一个 key 列"被表级归类掩盖了 description 无键的缺口，且 C2（30-verify）
//   是手工枚举清单、只管"值"不派生"列"。本检查器从 DDL 机械派生应查集合，
//   补上"列存在"这一层；C2 管"值非空"，两层闭合。
// 范围：CATALOG_TABLES 白名单（§3.2.5 适用面=系统目录/seed 基线表）；
//   EXEMPT = 品牌/技术名（§3.2.5 明文不译项），逐列显式豁免、须注明理由。
// 运行：pnpm lint:i18n-keys（node scripts/guardrails/check-i18n-keys.mjs）
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const DDL_DIR = path.join(process.cwd(), 'deploy', 'database', 'ddl');

// §3.2.5 适用面：系统目录表（seed 基线）。新目录表入 seed 时必须同步加进来。
const CATALOG_TABLES = new Set([
  'access.roles',
  'access.permissions',
  'admin.operator_role',
  'admin.operator_permission',
  'admin.settings',
  'admin.feature_flags',
  'identity.oauth_providers',
  'loyalty.level_policies',
  'product.product_categories',
  'product.products',
  'product.plans',
  'product.launch_checklist_items',
  'model.models',
  'model.model_providers',
]);

// 外显字段判定（列名尾段）。
const DISPLAY_RE = /(^|_)(name|title|label|description|display_name)$/;

// 豁免 = §3.2.5 明文"品牌/技术名不译"项。key 列自身与 *_key 不参与判定。
const EXEMPT = new Set([
  'product.products.product_name', // 品牌名：name 主 + nick 副双列决策，不译
  'product.products.product_nick', // 同上（译名/副名本身就是双语机制）
  'model.models.model_name',       // 技术名（gpt-4o 等）不译
  'model.model_providers.provider_name', // 品牌名不译
]);

function parseTables(sql) {
  const out = [];
  for (const block of sql.split(/CREATE TABLE /).slice(1)) {
    const name = block.match(/^([a-z_.]+)/)?.[1];
    if (!name) continue;
    const body = block.slice(0, block.indexOf(');'));
    const cols = [...body.matchAll(/^\s{4}([a-z_]+)\s+(varchar|text|char)/gm)].map((m) => m[1]);
    out.push({ name, cols });
  }
  return out;
}

const errors = [];
let scanned = 0;
for (const f of fs.readdirSync(DDL_DIR).filter((x) => /^[0-9].*\.sql$/.test(x))) {
  const sql = fs.readFileSync(path.join(DDL_DIR, f), 'utf8');
  for (const { name, cols } of parseTables(sql)) {
    if (!CATALOG_TABLES.has(name)) continue;
    scanned++;
    const colset = new Set(cols);
    for (const c of cols) {
      if (c.endsWith('_key')) continue;
      if (!DISPLAY_RE.test(c)) continue;
      if (EXEMPT.has(`${name}.${c}`)) continue;
      const want = `${c}_key`;
      if (!colset.has(want)) {
        errors.push(`  ERROR [${name}]  外显列 ${c} 缺伴生 i18n 键列 ${want}（§3.2.5；品牌/技术名请入 EXEMPT 并注明理由）`);
      }
    }
  }
}

console.log('══ i18n 伴生键列检查（check-i18n-keys）══');
console.log(`扫描目录表 ${scanned}/${CATALOG_TABLES.size} 张（deploy/database/ddl/）。`);
if (errors.length) {
  for (const e of errors) console.log(e);
  console.log('\n── 汇总 ──');
  console.log(`error: ${errors.length}`);
  process.exit(1);
}
console.log('✓ 全部目录表外显列均有伴生 i18n 键列（或已显式豁免）。');
console.log('\n── 汇总 ──');
console.log('error: 0');
