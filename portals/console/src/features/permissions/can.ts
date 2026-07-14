import type { Capability } from "@/entities/console";

export function hasCapability(
  capabilities: Capability[],
  target?: Capability,
): boolean {
  if (!target) {
    return true;
  }

  return capabilities.includes(target);
}

/**
 * 命中 `targets` 中任一能力即返回 true；`targets` 为空/未提供视为不限制。
 * 用于功能域级（domain）的「拥有任一即放行整域」门控。
 */
export function hasAnyCapability(
  capabilities: Capability[],
  targets?: Capability[],
): boolean {
  if (!targets || targets.length === 0) {
    return true;
  }

  return targets.some((target) => capabilities.includes(target));
}
