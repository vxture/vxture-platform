/**
 * tier-level.ts —— 套餐等级 → L1–L5 刻度。
 *
 * @package @vxture/admin
 * @layer Presentation
 * @category Shared
 *
 * ── 为什么等级不走六档语气 ────────────────────────────────────────────────
 * 语气表达的是**严重度**（好 / 要留意 / 坏），等级表达的是**序**（低 → 高）。
 * 把 enterprise 映射成 `danger` 或 `brand` 都不对：前者说它出事了，后者说它是新的。
 * DS 为此备了一条独立的品牌深浅阶梯 `--level-1..5`（brand-200 → brand-600，
 * 前景色随之从深字翻成白字），本文件就是把商业等级挂上那条阶梯。
 *
 * ── 补齐 admin 缺的两档 ───────────────────────────────────────────────────
 * `@vxture/shared` 的 `TIERS` 是**五档**（free / starter / pro / business /
 * enterprise，product_220 §1），admin 此前只认 free / pro / enterprise 三档，
 * starter 与 business 一起掉进 `other` 的灰色——五档里有两档在视觉上根本不存在
 * （盘点 §十一 记的缺色）。这里按 `TIERS` 的顺序全覆盖，`Record` 保证不再漏。
 */

import { TIERS, type Tier } from "@vxture/shared";

export type TierLevel = 1 | 2 | 3 | 4 | 5;

/** 等级 → 刻度。顺序即 `TIERS` 本身的顺序，低 → 高。 */
export const TIER_LEVEL: Record<Tier, TierLevel> = {
  free: 1,
  starter: 2,
  pro: 3,
  business: 4,
  enterprise: 5,
};

/**
 * 把展示用的套餐名归一到刻度。
 *
 * 读的是 `tierName` 这类自由文本（BFF 给的是展示名，大小写不定），认不出来时返回
 * `null`——**不猜**：一个认不出的套餐名标成 L1 会谎报它是最低档，宁可不着色。
 */
export function tierLevelOf(
  tierName: string | null | undefined,
): TierLevel | null {
  if (!tierName) return null;
  const key = tierName.trim().toLowerCase();
  const tier = TIERS.find((value) => value === key);
  return tier ? TIER_LEVEL[tier] : null;
}

/**
 * 等级标的类名。认不出的档返回中性标——与 `categoryTone()` 的中性同一个观感，
 * 但走 `Badge` 而不是 `StatusBadge`：它不是状态，不该带语气图标。
 */
export function tierBadgeClass(tierName: string | null | undefined): string {
  const level = tierLevelOf(tierName);
  return level ? `vx-level-badge vx-level-badge--${level}` : "vx-level-badge";
}

/**
 * 筛选下拉的档位集：五档 + 「其他」。
 *
 * `其他` 保留，但含义变窄了——此前它兜的是 starter/business/自定义三类，现在只兜
 * **不在 `TIERS` 里的自定义套餐名**。starter 与 business 各自成档，可以单独筛。
 */
export const TIER_FILTER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "business", label: "Business" },
  { value: "enterprise", label: "Enterprise" },
  { value: "other", label: "其他" },
] as const;

export type TierFilterValue = (typeof TIER_FILTER_OPTIONS)[number]["value"];

/** 把展示用的套餐名归一到筛选档。认不出的落 `other`。 */
export function tierFilterOf(
  tierName: string | null | undefined,
): TierFilterValue {
  const key = (tierName ?? "").trim().toLowerCase();
  const tier = TIERS.find((value) => value === key);
  return tier ?? "other";
}
