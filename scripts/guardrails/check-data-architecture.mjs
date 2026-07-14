#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// 数据架构设计文档 linter
//
// 把「顶层设计铁律 + 命名规范 + 推进中沉淀的问题」从文字固化为**可执行检查项**。
// 权威来源：docs/design/data_platform_100_architecture.md
//   · §2.2.4 架构级 SoT 与解耦铁律（铁律一~四）
//   · §3.2   命名与列规范（schema 单数 / table 复数无前缀 / column 单数 / VARCHAR+CHECK / 金额 NUMERIC）
// 命名前缀规范：data_{domain}_{NNN}_docname（1**架构 / 2**细化 / 3**实施）
//
// 设计目标：可持续扩展。**每发现一个新问题，就往下面 RULES 数组加一条规则**，
// 并在规则上注明它对应哪条铁律 / 哪次讨论（`refs`）。规则彼此独立、可单独禁用。
//
// 运行：  node scripts/guardrails/check-data-architecture.mjs [--quiet] [--warn-as-error]
// 别名：  pnpm lint:data-design
// 退出码：存在 error 级 finding → 1；仅 warning（且未 --warn-as-error）→ 0。
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const DOCS_DIR = join(REPO_ROOT, 'docs');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const WARN_AS_ERROR = argv.includes('--warn-as-error');

// ── 已知 schema 集（命名规范 R-schema 用）────────────────────────────────────
// 现行 + 拆分目标态；REJECTED 是讨论中被否决/改名的 schema，出现即回退。
const APPROVED_SCHEMAS = new Set([
  // 现行平台 8 schema（过渡期仍存在）
  'identity', 'iam', 'product', 'commerce', 'model', 'safety', 'admin', 'support',
  // identity 域细化拆分（data_identity_200_schema.md）
  'account', 'credential', 'kyc', 'tenancy', 'access', 'appoidc', 'session', 'loyalty',
  // commerce 域细化拆分（data_commerce_2xx）
  'metering', 'billing', 'provisioning',
  // sharing 域（ADR-12 D2 拍板，data_sharing_100/200 设计线；建库=M5/product_310 P4.2）
  'sharing',
  // Model Platform DB
  'routing', 'key', 'reqlog',
  // 业务面模板 + 其它
  'context', 'app', 'agent', 'local_usage', 'public',
]);
const REJECTED_SCHEMAS = ['sso', 'federation', 'broker', 'growth', 'app_oidc']; // 讨论否决/改名

// 已改名/退役的表名（出现即回退，除非 provenance 上下文）。
const RETIRED_TABLE_RES = [
  /tenant_subscriptions?\b/, /tenant_subscription_histor\w*/, /tenant_subscription_quota\w*/,
  /tenant_invoices?\b/, /tenant_invoice_\w+/, /tenant_payments?\b/, /tenant_payment_methods?\b/,
  /tenant_refunds?\b/, /tenant_transactions?\b/, /tenant_credits?\b/, /tenant_billing_address\w*/,
  /tenant_usage_event\w*/, /tenant_usage_summary\w*/, /tenant_app_provisioning\b/, /app_webhook_deliver\w*/,
  /commerce\.verification_polic\w*/, // 已迁 kyc.verification_policies
  /\bcoupons?\b/, // 卡券单表 coupons → promotion 三表(batch/voucher/redemption)，2026-07-04
  /support\.audit_log\b(?![s_])/, // support.audit_log → audit_logs(复数)，2026-07-04
  // 注：vouchers/voucher_* 是 promotion 三表的正式名，不列 retired
];

// 已改名/退役的文档文件名（内链应已全部更新）。
const RETIRED_FILE_RES = [
  /platform-data-architecture(-schema|-migration)?\.md/,
  /platform-data-cutover-runbook\.md/,
];

// provenance（沿革/纠错）上下文：这些词在行内出现时，允许提及旧名/旧做法而不算违规。
const PROVENANCE_RE =
  /原\s|原`|旧\b|旧`|曾用|曾叫|取代|supersed|retired|改名|弃用|作废|已删|历史|沿革|误标|本次修正|归属修正|不再作关联|改为真 FK|错误分类|迁移前|deploy 现|旧文档|旧架构|命名清理|简化为|统一为|改用|改成|重命名|升级为|升级为\*\*|已升级|早期在此|迁至|→ ?`/;

// 外部可视码列名（铁律二：可改、永不做 FK 目标）。区别于 level_no 这类自然主键。
const VISIBLE_CODES = ['user_no', 'tenant_no', 'workspace_no', 'bill_no', 'invoice_no', 'order_no', 'pay_order_no', 'refund_no', 'transaction_no'];

// ── 工具 ─────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      walk(p, out);
    } else if (name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

// 「目标态设计文档」= 顶部含 marker `<!-- data-architecture: target-state -->` 的文档。
// 只有这类文档被强约束用新名/新铁律；旧权威(data_platform_200_schema)、运维文档(deployment/ai)
// 描述的是**当前已部署（未迁移）状态**，合理保留旧名，仅受全局机械规则约束。
const TARGET_MARKER = /data-architecture:\s*target-state/;
const rel = (file) => file.slice(REPO_ROOT.length + 1).replace(/\\/g, '/');

// 逐行扫描 + provenance 跳过的通用匹配器
function scanLines(ctx, regex, make, { allowProvenance = true } = {}) {
  const findings = [];
  ctx.lines.forEach((line, i) => {
    // 跳过纯代码块围栏行本身不必要；正则各自负责精确匹配
    const m = line.match(regex);
    if (!m) return;
    if (allowProvenance && PROVENANCE_RE.test(line)) { ctx.suppressed++; return; }
    // full = 完整行（供规则做否定/上下文过滤，避免 excerpt 截断丢词）；excerpt 仅供展示
    findings.push({ line: i + 1, excerpt: line.trim().slice(0, 160), full: line, ...make(m, line) });
  });
  return findings;
}

// ── 规则集（新问题 → 在此追加一条）──────────────────────────────────────────
// 每条：{ id, title, refs, severity, scope('data'|'all'), run(ctx)->findings[] }
const RULES = [
  {
    id: 'naming/rejected-schema',
    title: 'schema 名用了讨论否决/改名前的名字',
    refs: '§3.2.1 schema 单数单词；命名沿革（sso→appoidc、broker→identity、growth→loyalty…）',
    severity: 'error', scope: 'target',
    run: (ctx) => {
      // 排除 .css/.js 等文件扩展名（growth.css 之类不是 schema 引用）
      const re = new RegExp(`\\b(${REJECTED_SCHEMAS.join('|')})\\.(?!css|js|ts|tsx|md|json|mjs|cjs|png|svg|scss)[a-z][a-z_]+`);
      return scanLines(ctx, re, (m) => ({
        msg: `疑似使用已否决/改名的 schema「${m[1]}」（schema 限定引用 ${m[0]}）`,
      }));
    },
  },
  {
    id: 'naming/retired-table',
    title: '出现已改名/退役的表名（去 tenant_ 前缀 / 拆分改名前）',
    refs: '§3.2.1 table 复数无 schema 前缀；commerce 去 tenant_ 前缀（2026-07-04）',
    severity: 'error', scope: 'target',
    run: (ctx) => {
      const findings = [];
      for (const re of RETIRED_TABLE_RES) {
        findings.push(...scanLines(ctx, re, (m) => ({ msg: `出现已退役表名「${m[0]}」` })));
      }
      return findings;
    },
  },
  {
    id: 'links/retired-filename',
    title: '引用了已改名的数据架构文档旧文件名',
    refs: 'feedback_data_docs_naming：platform-data-architecture*.md → data_platform_*',
    severity: 'error', scope: 'all',
    run: (ctx) => {
      const findings = [];
      for (const re of RETIRED_FILE_RES) {
        findings.push(...scanLines(ctx, re, (m) => ({ msg: `引用已改名文件「${m[0]}」，应用 data_platform_* 前缀名` })));
      }
      return findings;
    },
  },
  {
    id: 'links/broken-internal',
    title: '内部 markdown 链接指向不存在的 .md 文件',
    refs: '重命名后内链完整性（本轮 4 文件改名 + 表名去前缀）',
    severity: 'error', scope: 'all',
    run: (ctx) => {
      const findings = [];
      const linkRe = /\[[^\]]*\]\(([^)\s]+?\.md)(#[^)]*)?\)/g;
      ctx.lines.forEach((line, i) => {
        let m;
        linkRe.lastIndex = 0;
        while ((m = linkRe.exec(line))) {
          const target = m[1];
          if (/^https?:\/\//.test(target)) continue;
          const abs = resolve(dirname(ctx.file), target);
          if (!existsSync(abs)) {
            findings.push({ line: i + 1, excerpt: line.trim().slice(0, 160), msg: `断链：${target}` });
          }
        }
      });
      return findings;
    },
  },
  {
    id: 'ironlaw1/fk-boundary-citation',
    title: '声明"不建 FK / 裸值"却未标注属于哪一类边界',
    refs: '§2.2.4 铁律一：库内默认建真 FK；裸值仅四类边界（物理库界/realm隔离/审计actor/code目录）',
    severity: 'warning', scope: 'data',
    run: (ctx) => {
      const trigger = /不建.{0,4}FK|不建 FK|不建跨 schema FK|裸值|裸 ?uuid|不建外键|零外键|零 FK/;
      const cite = /边界#|boundary|realm|物理库|跨库|audit|append-only|code 目录|按 code|按值解析|跨轮前置|退役过渡|暂裸值|agent_catalog/;
      return scanLines(ctx, trigger, () => ({
        msg: '"不建 FK/裸值" 未在同行标注 边界#N 或其类别 → 可能是未按铁律一重新推导的旧例外（参见 role→code 教训）',
      })).filter((f) => !cite.test(f.full));
    },
  },
  {
    id: 'ironlaw1/code-as-fk',
    title: '把非唯一的 .code 列当作 FK/关联键目标',
    refs: '§2.2.4 铁律一 + role_id 修正：roles 唯一性是 (scope,code)，code 单列不唯一，不能做 FK 目标',
    severity: 'error', scope: 'data',
    run: (ctx) => scanLines(ctx, /(FK→|FK ->|REFERENCES\s+)[`\w.]*\.code\b/i, () => ({
      msg: 'FK 指向 `.code` 列（非唯一）→ 应改用 id 复合 FK（见 tenant_memberships.role_id 修正）',
    }), { allowProvenance: true }),
  },
  {
    id: 'ironlaw2/visible-code-as-fk',
    title: '把外部可视码（*_no）当作 FK 目标',
    refs: '§2.2.4 铁律二：关联只走不可变 id uuid；可视码(user_no/bill_no…)可改，永不做 FK',
    severity: 'error', scope: 'data',
    run: (ctx) => {
      const re = new RegExp(`(FK→|FK ->|REFERENCES\\s+)[\`\\w.]*\\.(${VISIBLE_CODES.join('|')})\\b`, 'i');
      return scanLines(ctx, re, (m) => ({
        msg: `外部可视码作 FK 目标（${m[0]}）→ 违反铁律二，关联须指向 id uuid`,
      }));
    },
  },
  {
    id: 'naming/pg-enum',
    title: '使用了 PostgreSQL ENUM 类型',
    refs: '§3.2.2：枚举一律 VARCHAR(32)+CHECK，不用 PG ENUM（避免迁移锁/不可回退）',
    severity: 'error', scope: 'all',
    run: (ctx) => scanLines(ctx, /\bAS\s+ENUM\b|\bENUM\s*\(/i, () => ({
      msg: '出现 PG ENUM → 应改 VARCHAR(32)+CHECK',
    }), { allowProvenance: false }),
  },
  {
    id: 'naming/money-token-type',
    title: '金额/计数用了浮点或 money 类型',
    refs: '§3.2.2：金额 NUMERIC(12,2)、单价 NUMERIC(18,6)、token/配额 BIGINT，禁浮点',
    severity: 'warning', scope: 'data',
    run: (ctx) => scanLines(ctx, /\b(double precision|float4|float8|\breal\b|\bmoney\b|\bFLOAT\b)\b/, (m) => ({
      msg: `疑似浮点/money 类型「${m[1]}」用于金额 → 金额用 NUMERIC，计数用 BIGINT`,
    })),
  },
  {
    id: 'actor/legacy-field',
    title: '残留旧 actor 字段名（operator_type / operator_remark）',
    refs: 'actor 标准化 §0.1：跨 realm 操作用 actor_type/actor_id，operator_* 已改名',
    severity: 'warning', scope: 'data',
    run: (ctx) => scanLines(ctx, /\boperator_type\b|\boperator_remark\b/, (m) => ({
      msg: `残留旧 actor 字段「${m[0]}」→ 应为 actor_type / remark（见 commerce §0.1）`,
    }), { allowProvenance: true }),
  },
  {
    id: 'metering/summary-not-billing',
    title: '把 usage_summary 汇总表用作计费/结算依据',
    refs: '§2.2.4 铁律五：汇总仅统计/看板，永不作计费依据；计费从 usage_events 按锚定周期窗口求和',
    severity: 'error', scope: 'target',
    run: (ctx) => {
      const bill = /计费|结算|超额|出账|billing|invoice|overage/i;
      const neg = /不读|不作|非计费|仅统计|只做统计|从不|统计\/看板|禁|不承担/;
      return scanLines(ctx, /usage_summary/i, () => ({
        msg: '疑似以 usage_summary 作计费依据 → 汇总仅统计；计费须从 usage_events 按周期窗口求和',
      }), { allowProvenance: false }).filter((f) => bill.test(f.full) && !neg.test(f.full));
    },
  },
  {
    id: 'metering/anchored-period',
    title: '配额/计费周期用 date_trunc 日历对齐（应锚定订阅周期）',
    refs: '§2.2.4 铁律五：配额/计费锚定 subscriptions.start_at（period_anchor），禁用 date_trunc 日历对齐',
    severity: 'warning', scope: 'target',
    run: (ctx) => {
      const neg = /禁用|非 ?date_trunc|不用|不再|避免|forbid|非日历/;
      return scanLines(ctx, /date_trunc/i, () => ({
        msg: 'date_trunc 日历对齐 → 锚定周期模型下应按 period_anchor 推进（除非本行明确是反例说明）',
      })).filter((f) => !neg.test(f.full));
    },
  },
  {
    id: 'ironlaw7/realm-isolation-fk',
    title: '运营域(operator)与客户域身份跨 realm 建了 FK（违反双 realm 绝对隔离）',
    refs: '§2.2.4 铁律七：operator_* 与客户 realm(account/identity/tenancy/credential/kyc/access/session/loyalty)零 FK 双向',
    severity: 'error', scope: 'target',
    run: (ctx) => {
      const cust = '(account|identity|tenancy|credential|kyc|access|session|loyalty)';
      // 同一行同时出现 operator_ 表 + FK→ 箭头 + 客户 realm schema 限定引用 = 跨 realm 身份 FK
      const re = new RegExp(`operator_\\w+[^|]*FK→[^|]*\\b${cust}\\.|\\b${cust}\\.\\w+[^|]*FK→[^|]*operator_`, 'i');
      return scanLines(ctx, re, () => ({
        msg: '疑似 operator ↔ 客户 realm 建了身份 FK → 违反铁律七（域内同 schema FK 才允许，跨 realm 禁）',
      }), { allowProvenance: false });
    },
  },
  {
    id: 'ironlaw/stale-count',
    title: '引用 §2.2.4 铁律条数陈旧（当前为八条）',
    refs: '§2.2.4 现为八条铁律（新增铁律八·标识符三层命名纪律）；引用"四条/六条/七条"等即过时',
    severity: 'warning', scope: 'all',
    run: (ctx) => {
      const re = /§2\.2\.4[^\n]{0,6}([一二三四五六七八九十]+)\s*条铁律/;
      return scanLines(ctx, re, (m) => ({
        msg: `铁律条数标注为「${m[1]}条」，与权威 §2.2.4 现状「八条」不符`,
      })).filter((f) => !/八\s*条铁律/.test(f.full));
    },
  },
  {
    id: 'ironlaw8/id-column-must-be-uuid',
    title: '内部 `*_id` 列类型非 uuid（禁止 *_id 承载可视码/非关联值）',
    refs: '§2.2.4 铁律八：id/{table}_no/{parent}_id 三层不混淆；内部关联 *_id 必 uuid，可视码用 *_no。外部/联邦句柄（OIDC client_id/WebAuthn credential_id/跨库 request_id 等）是合法第四类，白名单豁免',
    severity: 'error', scope: 'data',
    run: (ctx) => {
      // 字段表行：| `xxx_id` | <类型> | ...  —— 仅当第2列是 SQL 类型时才视为字段表（排除描述性表）
      const TYPE_START = /^(uuid|varchar|char|text|int|integer|bigint|smallint|numeric|decimal|boolean|bool|jsonb|json|timestamptz|timestamp|date|bytea|serial|inet|\w+\[\])/i;
      // 外部/联邦/跨界不透明句柄（按规范为字符串，非内部 uuid FK）= 合法第四类，豁免
      const EXTERNAL_ID_ALLOW = new Set([
        'client_id', 'credential_id', 'request_id', 'external_id',
        'provider_message_id', 'source_ref_id', 'session_id', 'provider_subject_id',
      ]);
      const EXTERNAL_CTX = /外部|external|网关|gateway|provider|回执|webhook|token|oidc|webauthn|passkey|跨库|跨域|边界#|cross-boundary|联邦|federat|reqlog|opaque/i;
      const re = /^\|\s*`?([a-z][a-z0-9_]*_id)`?\s*\|\s*([^|]+?)\s*\|/i;
      const findings = [];
      ctx.lines.forEach((line, i) => {
        const m = line.match(re);
        if (!m) return;
        const col = m[1], type = m[2].trim();
        if (!TYPE_START.test(type)) return;             // 第2列非 SQL 类型 → 非字段表行
        if (/uuid/i.test(type)) return;                 // uuid → 合规
        if (EXTERNAL_ID_ALLOW.has(col)) return;         // 已知外部/联邦句柄
        if (EXTERNAL_CTX.test(line)) return;            // 行内含外部/边界语境
        if (PROVENANCE_RE.test(line)) { ctx.suppressed++; return; }
        findings.push({
          line: i + 1, excerpt: line.trim().slice(0, 160),
          msg: `内部字段 \`${col}\` 以 _id 结尾但类型非 uuid（${type}）→ 违反铁律八；关联列须 uuid，可视码改用 *_no（外部句柄请入白名单或加边界语境）`,
        });
      });
      return findings;
    },
  },
  {
    id: 'naming/file-prefix',
    title: '数据架构文档文件名不符合 data_{domain}_{NNN}_name 前缀',
    refs: 'feedback_data_docs_naming：1**架构 / 2**细化 / 3**实施，编号十进制拉开',
    severity: 'error', scope: 'all',
    run: (ctx) => {
      const b = basename(ctx.file);
      if (!b.startsWith('data_')) return [];
      if (/^data_[a-z]+_\d{3}_[a-z0-9-]+\.md$/.test(b)) return [];
      return [{ line: 1, excerpt: b, msg: `文件名不符合 data_{domain}_{NNN}_docname.md 规范` }];
    },
  },
];

// ── 执行 ─────────────────────────────────────────────────────────────────────
const files = existsSync(DOCS_DIR) ? walk(DOCS_DIR) : [];
const all = [];
let suppressedTotal = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const ctx = { file, content, lines: content.split(/\r?\n/), suppressed: 0 };
  const targetDoc = TARGET_MARKER.test(content);
  for (const rule of RULES) {
    // 'target'/'data' 作用域的规则只对声明 marker 的目标态文档生效
    if ((rule.scope === 'target' || rule.scope === 'data') && !targetDoc) continue;
    let findings = [];
    try {
      findings = rule.run(ctx) || [];
    } catch (e) {
      findings = [{ line: 0, excerpt: '', msg: `规则执行异常：${e.message}` }];
    }
    for (const f of findings) all.push({ ...f, file, rule: rule.id, severity: rule.severity, refs: rule.refs });
  }
  suppressedTotal += ctx.suppressed;
}

// ── 报告 ─────────────────────────────────────────────────────────────────────
const errors = all.filter((f) => f.severity === 'error');
const warnings = all.filter((f) => f.severity === 'warning');
const shown = QUIET ? errors : all;

const byFile = new Map();
for (const f of shown) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

console.log('══ 数据架构设计检查（check-data-architecture）══');
console.log(`扫描 ${files.length} 个 .md（docs/），规则 ${RULES.length} 条。\n`);

if (shown.length === 0) {
  console.log('✓ 未发现问题' + (QUIET ? '（error 级）' : '') + `。（provenance 豁免 ${suppressedTotal} 处）`);
} else {
  for (const [file, list] of [...byFile.entries()].sort()) {
    console.log(`● ${rel(file)}`);
    for (const f of list.sort((a, b) => a.line - b.line)) {
      const tag = f.severity === 'error' ? 'ERROR' : 'warn ';
      console.log(`  ${tag} L${f.line}  [${f.rule}]  ${f.msg}`);
      if (f.excerpt) console.log(`        ↳ ${f.excerpt}`);
    }
    console.log('');
  }
}

console.log('── 汇总 ──');
console.log(`error: ${errors.length}   warning: ${warnings.length}   provenance 豁免: ${suppressedTotal}`);
if (!QUIET && warnings.length) {
  const byRule = {};
  for (const w of warnings) byRule[w.rule] = (byRule[w.rule] || 0) + 1;
  console.log('warning 分布：', JSON.stringify(byRule));
}

const failed = errors.length > 0 || (WARN_AS_ERROR && warnings.length > 0);
process.exit(failed ? 1 : 0);
