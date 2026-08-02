/**
 * cn.ts - 类名合并工具
 * @package @vxture/design-ui
 *
 * clsx 拼接 + tailwind-merge 去冲突。**tailwind-merge 必须按本仓的 T2 命名重新配置**
 * ——它认错组的后果是静默丢类，没有任何报错。
 *
 * @copyright Vxture Team
 * @layer Shared
 * @category Utils
 */

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** T2 排版角色族。`text-<族>-<档>` 产出的是字号，不是颜色。 */
const TYPE_FAMILIES = [
  "display",
  "heading",
  "title",
  "body",
  "label",
  "code",
] as const;

/**
 * `text-` 前缀在 Tailwind 里同时承载**字号**和**文字颜色**两组，tailwind-merge
 * 靠内置刻度表把二者分开。我们的 T2 角色名不在那张表里，于是它把
 * `text-label-sm`（字号）和 `text-primary-foreground`（颜色）判成同一组，
 * 后写的挤掉先写的——**类名直接从 DOM 上消失**。
 *
 * 实测症状：Button 基础类里有 `text-primary-foreground`、`xs` 尺寸变体里有
 * `text-label-sm`，合并后蓝底按钮的文字变成深灰，而且只有这一档如此——
 * 其余档没写字号覆盖，所以没触发。
 *
 * 显式登记后：`text-<六族>-*` 与 `text-overline` 归字号组，其余 `text-*` 仍按颜色处理。
 */
/** 角色档位不做穷举：新增一档不必回来改这里。 */
const anyStep = () => true;

const twMergeConfigured = extendTailwindMerge<"vx-type">({
  extend: {
    classGroups: {
      // 自成一组，与内置 `text-color` 互不相干，故二者可以共存。
      // ⚠ 必须用 Record 形式逐段声明；`"label-*"` 这种通配串在 v3 不匹配，
      //   写了不报错，只是所有角色继续落回 text-color——症状与没配一模一样。
      "vx-type": [
        {
          text: [
            ...TYPE_FAMILIES.map((family) => ({ [family]: [anyStep] })),
            "overline",
          ],
        },
      ],
    },
    // 与内置字号组互斥：`text-sm` 和 `text-label-lg` 说的是同一件事，
    // 两条都留下等于让 CSS 顺序决定，那不叫合并。
    conflictingClassGroups: {
      "vx-type": ["font-size"],
      "font-size": ["vx-type"],
    },
  },
});

/**
 * 类名合并工具函数。
 *
 * @param inputs - 类名列表，支持字符串、对象、数组等多种格式
 * @returns 合并后的类名字符串
 * @example
 * ```tsx
 * cn('btn', { 'btn-primary': isPrimary }, ['px-md', 'py-sm'])
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMergeConfigured(clsx(inputs));
}
