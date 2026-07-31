/**
 * next.ts - shadcn 惯例 + cva 组件的并行入口。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Entry
 *
 * 本入口承载按 shadcn 惯例（cva + Radix）重写、且只绑 T2 语义层的组件。
 * 与根入口并存：根入口的既有组件保持不变，消费方按自己的节奏迁移。
 *
 * 迁移完成后本入口的组件将升格为根入口的实现；在此之前，
 * 两处导出同名组件属预期，不是重复实现。
 */

"use client";

export { Button, buttonVariants } from "./components/next/Button";
export type { ButtonProps } from "./components/next/Button";
