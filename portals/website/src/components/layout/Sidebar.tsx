/**
 * Sidebar.tsx
 *
 * 功能：
 * - 响应式侧边栏组件，用于移动端导航和额外内容展示
 * - 支持展开/收起动画、主题适配
 *
 * 用途：
 * - 移动端导航菜单
 * - 过滤器、设置面板等辅助内容
 *
 * 依赖/调用关系：
 * - 使用 useTheme from @vxture/design-system 获取主题状态
 * - 可被 Header.tsx 或页面组件调用
 *
 * @file Sidebar.tsx
 * @desc 响应式侧边栏组件，支持动画、主题适配
 * @author AI-Generated
 * @created 2026-03-15
 * @date 2026-03-18
 * @copyright Copyright (c) 2024-2025 vxture
 * @version 2.0.0
 * @dependencies React, useTheme
 * @category Components - Layout
 * @layer Presentation
 */

"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@vxture/design-system";

// ============================================================================
// 类型定义区
// ============================================================================

export interface SidebarProps {
  /** 侧边栏是否打开 */
  isOpen: boolean;
  /** 关闭侧边栏的回调 */
  onClose: () => void;
  /** 侧边栏位置 */
  position?: "left" | "right";
  /** 侧边栏宽度 */
  width?: string;
  /** 子内容 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否显示遮罩层 */
  showOverlay?: boolean;
}

// ============================================================================
// 组件实现区
// ============================================================================

export default function Sidebar({
  isOpen,
  onClose,
  position = "right",
  width = "300px",
  children,
  className = "",
  showOverlay = true,
}: SidebarProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      {showOverlay && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isDarkMode ? "bg-vx-black/60" : "bg-vx-black/40"
          }`}
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <div
        ref={sidebarRef}
        className={`absolute top-0 h-full transition-transform duration-300 ease-out ${
          position === "right" ? "right-0" : "left-0"
        } ${className}`}
        style={{ width }}
      >
        <div
          className={`h-full ${
            isDarkMode ? "bg-vx-gray-900" : "bg-vx-surface"
          } shadow-xl`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
