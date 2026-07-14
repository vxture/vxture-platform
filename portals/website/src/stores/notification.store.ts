/**
 * notification.store.ts
 *
 * 功能：
 * - 统一管理所有全局通知状态，便于集中维护
 * - 提供 success/error/warning/info 类型消息的增删、自动关闭等能力
 *
 * 用途：
 * - 供 Notifications 组件及全局 UI 调用，集中管理用户提示
 * - 结构与 authStore.ts、themeStore.ts、i18nStore.ts 保持一致，便于团队协作
 *
 * 依赖/调用关系：
 * - 依赖 uuid 生成唯一ID
 * - 依赖 zustand 状态管理
 * - 被 src/components/common/Notifications.tsx 消费
 *
 * 设计规范：
 * - 只存放状态与方法，不包含 UI 逻辑
 * - 命名、结构、注释与其它 Store 保持一致
 *
 * @file notification.store.ts
 * @desc 通知相关全局状态管理，统一支持消息增删、自动关闭等
 * @author vxture team
 * @created 2024-10-01
 * @lastModified 2025-10-15
 * @modifiedBy stonesmoker
 * @copyright Copyright (c) 2024-2025 vxture
 * @version 1.0.0
 * @dependencies React, Zustand, uuid
 * @see src/components/common/Notifications.tsx 通知展示组件
 * @tags notification, store
 * @example
 *   const { addNotification } = useNotificationStore();
 *   addNotification('操作成功', 'success');
 * @remarks
 *   仅存放通知状态与方法，业务逻辑请移至组件/服务层。
 * @todo
 *   支持多语言、分组通知、持久化等
 */

// ============================================================================
// 依赖导入
// ============================================================================
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// 类型定义区 - 通知类型、状态类型
// ============================================================================

/**
 * 通知类型
 * - 支持 success/error/warning/info
 */
type NotificationType = "success" | "error" | "warning" | "info";

/**
 * 通知项类型
 * - 单条通知的结构
 */
interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; // 自动关闭时间（毫秒，默认3000）
}

/**
 * 通知 Store 状态类型
 * - 管理通知列表与操作方法
 */
interface NotificationState {
  notifications: Notification[];
  /**
   * 添加通知
   * @param message 通知内容
   * @param type 通知类型
   * @param duration 自动关闭时间（毫秒）
   * @returns 通知ID
   */
  addNotification: (
    message: string,
    type: NotificationType,
    duration?: number,
  ) => string;
  /**
   * 移除通知
   * @param id 通知ID
   */
  removeNotification: (id: string) => void;
}

// ============================================================================
// Store 创建区 - useNotificationStore 实现
// ============================================================================

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],

  /**
   * 添加通知
   * - 支持自动关闭
   */
  addNotification: (message, type, duration = 3000) => {
    const id = uuidv4();
    const newNotification: Notification = { id, message, type, duration };
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }
    return id;
  },

  /**
   * 移除通知
   */
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
