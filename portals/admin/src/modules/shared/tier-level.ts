/**
 * tier-level.ts —— 套餐等级 → 商业分档。
 *
 * @package @vxture/admin
 * @layer Presentation
 * @category Shared
 *
 * ── 为什么等级不走六档语气 ────────────────────────────────────────────────
 * 语气表达的是**严重度**（好 / 要留意 / 坏），等级表达的是别的东西。把 enterprise
 * 映射成 `danger` 或 `brand` 都不对：前者说它出事了，后者说它是新的。
 *
 * ── 为什么不是五级深浅阶梯（owner 2026-08-06 实测后改）────────────────────
 * 第一版把五档挂在 DS 的 `--level-1..5` 上（brand-200 → brand-600 逐级加深）。
 * 实测**文字看不清**：那条阶梯是给色块用的，中间几档底色已经压下来、前景却还是
 * 深字，对比度不够。
 *
 * 更要紧的是**五级深浅并没有对应五件事**。真正要一眼分出来的是三类客户：
 *
 * | 档                       | 是什么       | 表现            |
 * | ------------------------ | ------------ | --------------- |
 * | free                     | 还没付费     | 中性描边        |
 * | starter / pro / business | 云端付费客户 | 品牌淡底        |
 * | enterprise               | 私有化大客户 | 品牌实底 + 白字 |
 *
 * 三档正好落在 DS `Badge` 已有的三个 variant 上（`outline` / `secondary` /
 * `default`），配色与对比度由 DS 自己保证，admin 不再自备任何等级 CSS。
 *
 * ── 补齐 admin 缺的两档 ───────────────────────────────────────────────────
 * `@vxture/shared` 的 `TIERS` 是**五档**（product_220 §1），admin 此前只认
 * free / pro / enterprise，starter 与 business 一起掉进 `other` 的灰（盘点 §十一
 * 记的缺色）。`Record<Tier, …>` 保证不再漏。
 */

import type { BadgeVariant } from "@vxture/design-system";
import { TIERS, type Tier } from "@vxture/shared";

/** 等级 → `Badge` 变体。三档的判据见文件头。 */
export const TIER_VARIANT: Record<Tier, BadgeVariant> = {
  free: "outline",
  starter: "secondary",
  pro: "secondary",
  business: "secondary",
  enterprise: "default",
};

/**
 * 把展示用的套餐名归一到变体。
 *
 * 读的是 `tierName` 这类自由文本（BFF 给的是展示名，大小写不定），认不出来时退回
 * `outline`——**不猜**：认不出的套餐名标成实底会谎报它是私有化大客户。
 */
export function tierVariant(tierName: string | null | undefined): BadgeVariant {
  if (!tierName) return "outline";
  const key = tierName.trim().toLowerCase();
  const tier = TIERS.find((value) => value === key);
  return tier ? TIER_VARIANT[tier] : "outline";
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
