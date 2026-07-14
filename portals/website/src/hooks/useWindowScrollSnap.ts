/**
 * useWindowScrollSnap.ts - 窗口滚动吸附钩子
 *
 * 功能：实现页面元素的滚动吸附效果，提供目标检测和自动吸附功能
 *
 * @author Stone Smoker
 * @created 2024-06-01
 * @lastModified 2026-03-03
 * @version 2.0.0
 * @copyright Copyright (c) 2024-2026 Vxture Team
 *
 * @layer Application
 * @category Hooks
 */

import { useEffect, useState, useCallback, useRef } from "react";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 输入参数类型
 */
interface WindowScrollSnapConfig {
  debugFlag: boolean;
  targetSelector: string;
  targetAlignTo?: "top" | "center" | "bottom" | "auto";
  snapThreshold?: number;
  enabledDirections?: ("up" | "down")[];
  observerRoot?: HTMLElement;
}

/**
 * 输出参数类型
 */
interface WindowScrollSnapReturn {
  activeTarget: HTMLElement | null;
  snapToTarget: (target: HTMLElement) => void;
  snapdebugInfo?: {
    screenRect: DOMRect | null;
    targetRect: DOMRect | null;
    targetsCount: number;
    targetAlignTo: string;
    isScrollingDirection: "up" | "down" | "no";
    activeTargetId: string | null;
    activeTargetName: string | null;
    snapThreshold: number;
    scrollVelocity: number;
    scrollX: number;
    scrollY: number;
  };
}

/**
 * 滚动方向类型
 */
type ScrollDirection = "up" | "down" | "no";

// ============================================================================
// 常量定义
// ============================================================================

/** 快速滚动阈值（像素） */
const FAST_SCROLL_THRESHOLD = 300;

/** 安全判断：是否有 window 对象（模块级别常量，避免 React Hook 依赖警告） */
const hasWindow = globalThis?.window !== undefined;

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * useWindowScrollSnap - 主 hook 实现
 */
export function useWindowScrollSnap(
  config: WindowScrollSnapConfig,
): WindowScrollSnapReturn {
  // ==========================================================================
  // 状态初始化
  // ==========================================================================

  /** 参数解构，提供默认值 */
  const {
    debugFlag,
    targetSelector,
    targetAlignTo = "top",
    snapThreshold = 150,
    enabledDirections = ["up", "down"],
    observerRoot = null,
  } = config;

  /** 响应式阈值：根据视口高度动态计算 */
  const [responsiveThreshold, setResponsiveThreshold] =
    useState<number>(snapThreshold);
  /** 使用响应式阈值替代固定阈值 */
  const activeSnapThreshold = responsiveThreshold;

  /** 当前活跃目标元素 */
  const [activeTarget, setActiveTarget] = useState<HTMLElement | null>(null);
  /** 当前所有目标元素列表 */
  const [targets, setTargets] = useState<HTMLElement[]>([]);

  /** 滚动相关引用变量 - 标记是否为程序触发滚动 */
  const isProgramScrollingRef = useRef(false);
  /** 滚动相关引用变量 - 上一次滚动位置 */
  const lastScrollYRef = useRef(0);
  /** 滚动相关引用变量 - 存储清理函数，用于快速点击时清理旧监听器 */
  const scrollEndCleanupRef = useRef<(() => void) | null>(null);
  /** 滚动相关引用变量 - 状态同步 */
  const stateRef = useRef<{
    targets: HTMLElement[];
    activeTarget: HTMLElement | null;
    isTargetInThreshold: (element: HTMLElement) => boolean;
  }>({
    targets: [],
    activeTarget: null,
    isTargetInThreshold: () => false,
  });

  /** 调试信息状态（仅 debugFlag 为 true 时有效） */
  const [snapdebugInfo, setsnapdebugInfo] = useState<
    WindowScrollSnapReturn["snapdebugInfo"]
  >(() =>
    debugFlag
      ? {
          screenRect: null,
          targetRect: null,
          targetsCount: 0,
          activeTargetId: null,
          activeTargetName: null,
          targetAlignTo,
          snapThreshold: activeSnapThreshold,
          isScrollingDirection: "no",
          scrollVelocity: 0,
          scrollX: 0,
          scrollY: 0,
        }
      : undefined,
  );

  // ==========================================================================
  // 工具函数 - 内部辅助
  // ==========================================================================

  /**
   * 更新调试信息
   * 只合并 partialInfo，避免把依赖参数直接写进依赖，否则会导致无限循环
   */
  const updateDebugInfo = useCallback(
    (
      partialInfo: Partial<
        NonNullable<WindowScrollSnapReturn["snapdebugInfo"]>
      >,
    ) => {
      if (debugFlag) {
        setsnapdebugInfo((prev) =>
          prev
            ? {
                ...prev,
                ...partialInfo,
              }
            : prev,
        );
      }
    },
    [debugFlag],
  );

  /**
   * 计算响应式阈值
   * 基于视口高度的 25%，最小 150px，最大 400px
   */
  const calculateThreshold = useCallback(() => {
    if (!hasWindow) return snapThreshold;
    const vh = (globalThis.window as Window).innerHeight;
    const calculated = Math.min(Math.max(vh * 0.4, 150), 400);
    return Math.round(calculated);
  }, [snapThreshold]);

  /**
   * 计算滚动位置
   */
  const calculateScrollTop = (
    rect: DOMRect,
    viewportHeight: number,
    currentScrollY: number,
    alignTo: string,
  ): number => {
    let scrollTop = currentScrollY;
    switch (alignTo) {
      case "auto":
        scrollTop +=
          rect.height < viewportHeight
            ? rect.top + rect.height - viewportHeight
            : rect.top;
        break;
      case "center":
        scrollTop += rect.top - (viewportHeight - rect.height) / 2;
        break;
      case "bottom":
        scrollTop += rect.top + rect.height - viewportHeight;
        break;
      default:
        scrollTop += rect.top;
        break;
    }
    return scrollTop;
  };

  /**
   * 判断目标元素是否进入吸附范围
   */
  const isTargetInThreshold = useCallback(
    (element: HTMLElement): boolean => {
      if (!hasWindow) return false;

      const style = (globalThis.window as Window).getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden")
        return false;

      const rect = element.getBoundingClientRect();
      if (rect.height <= 0) return false;

      const viewportHeight = (globalThis.window as Window).innerHeight;
      const isTopNear = Math.abs(rect.top) <= activeSnapThreshold;
      const isBottomNear =
        Math.abs(rect.bottom - viewportHeight) <= activeSnapThreshold;
      const isFullyInView = rect.top >= 0 && rect.bottom <= viewportHeight;

      return isTopNear || isBottomNear || isFullyInView;
    },
    [activeSnapThreshold],
  );

  /**
   * 查询并更新目标元素列表
   */
  const queryTargets = useCallback(() => {
    if (!hasWindow || !targetSelector) return;

    const foundTargets = Array.from(
      document.querySelectorAll<HTMLElement>(targetSelector),
    )
      .filter((el) => {
        const style = (globalThis.window as Window).getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .sort((a, b) => {
        const aTop =
          a.getBoundingClientRect().top + (globalThis.window as Window).scrollY;
        const bTop =
          b.getBoundingClientRect().top + (globalThis.window as Window).scrollY;
        return aTop - bTop;
      });

    setTargets(foundTargets);
    updateDebugInfo({ targetsCount: foundTargets.length });
  }, [targetSelector, updateDebugInfo]);

  /**
   * 采集并更新窗口尺寸和滚动信息
   */
  const updateScreenAndScrollInfo = useCallback(() => {
    if (!hasWindow) return;

    const screenRect = new DOMRect(
      (globalThis.window as Window).scrollX,
      (globalThis.window as Window).scrollY,
      (globalThis.window as Window).innerWidth,
      (globalThis.window as Window).innerHeight,
    );

    let targetRect: DOMRect | null = null;
    if (activeTarget) {
      targetRect = activeTarget.getBoundingClientRect();
    }

    updateDebugInfo({
      screenRect,
      targetRect,
      scrollX: (globalThis.window as Window).scrollX,
      scrollY: (globalThis.window as Window).scrollY,
    });
  }, [updateDebugInfo, activeTarget]);

  // ==========================================================================
  // 核心功能 - 吸附到目标
  // ==========================================================================

  /**
   * 设置 scrollend 监听器（现代浏览器）
   */
  const setupScrollEndListener = (
    win: Window,
    handleScrollEnd: () => void,
  ): (() => void) => {
    const scrollEndHandler = () => {
      handleScrollEnd();
      win.removeEventListener("scrollend", scrollEndHandler);
    };
    win.addEventListener("scrollend", scrollEndHandler, { once: true });
    return () => {
      win.removeEventListener("scrollend", scrollEndHandler);
    };
  };

  /**
   * 设置 scroll 监听器（降级方案）
   */
  const setupFallbackScrollListener = (
    win: Window,
    handleScrollEnd: () => void,
    debugFlag: boolean,
  ): (() => void) => {
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;

    const fallbackScrollEnd = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        handleScrollEnd();
        win.removeEventListener("scroll", fallbackScrollEnd);
      }, 150);
    };

    win.addEventListener("scroll", fallbackScrollEnd, { passive: true });

    const timeoutTimer = setTimeout(() => {
      if (scrollTimer) clearTimeout(scrollTimer);
      win.removeEventListener("scroll", fallbackScrollEnd);
      if (isProgramScrollingRef.current && debugFlag) {
        console.log("Fallback: Force reset isProgramScrolling after timeout");
      }
    }, 2000);

    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      win.removeEventListener("scroll", fallbackScrollEnd);
    };
  };

  /**
   * 吸附到指定目标元素
   */
  const snapToTarget = useCallback(
    (target: HTMLElement) => {
      if (debugFlag) console.log("Snapping to target:", target.id || "unknown");
      if (!hasWindow || !target) return;

      // 清理之前的监听器（防止快速点击时累积）
      if (scrollEndCleanupRef.current) {
        if (debugFlag) console.log("Cleaning up previous scroll listener");
        scrollEndCleanupRef.current();
        scrollEndCleanupRef.current = null;
      }

      isProgramScrollingRef.current = true;
      const win = globalThis.window as Window;
      const rect = target.getBoundingClientRect();
      const viewportHeight = win.innerHeight;
      const scrollTop = calculateScrollTop(
        rect,
        viewportHeight,
        win.scrollY,
        targetAlignTo,
      );

      // 始终采用平滑滚动
      win.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });

      setActiveTarget(target);
      const getName = (el: HTMLElement): string | null => {
        return el.dataset.name ?? null;
      };
      updateDebugInfo({
        activeTargetId: target.id,
        activeTargetName: getName(target),
      });

      // 滚动结束后更新目标矩形信息和重置程序滚动标记
      const handleScrollEnd = () => {
        const updatedRect = target.getBoundingClientRect();
        updateDebugInfo({ targetRect: updatedRect });
        isProgramScrollingRef.current = false;
        scrollEndCleanupRef.current = null;
      };

      // 检查浏览器是否支持 scrollend 事件
      if ("onscrollend" in win) {
        const cleanup = setupScrollEndListener(win, handleScrollEnd);
        scrollEndCleanupRef.current = () => {
          cleanup();
          isProgramScrollingRef.current = false;
        };
      } else {
        const cleanup = setupFallbackScrollListener(
          win,
          handleScrollEnd,
          debugFlag,
        );
        scrollEndCleanupRef.current = () => {
          cleanup();
          isProgramScrollingRef.current = false;
        };
      }
    },
    [targetAlignTo, debugFlag, updateDebugInfo],
  );

  // ==========================================================================
  // Effects
  // ==========================================================================

  /**
   * 初始化和窗口大小变化时更新阈值
   */
  useEffect(() => {
    const updateThreshold = () => {
      const newThreshold = calculateThreshold();
      setResponsiveThreshold(newThreshold);
      if (debugFlag) {
        console.log(
          `Responsive threshold updated: ${newThreshold}px (viewport: ${(globalThis.window as Window).innerHeight}px)`,
        );
      }
    };

    updateThreshold();

    if (hasWindow) {
      (globalThis.window as Window).addEventListener(
        "resize",
        updateThreshold,
        { passive: true },
      );
      return () =>
        (globalThis.window as Window).removeEventListener(
          "resize",
          updateThreshold,
        );
    }
    return;
  }, [calculateThreshold, debugFlag]);

  /**
   * 监听参数变化并同步到调试面板
   */
  useEffect(() => {
    if (debugFlag) {
      setsnapdebugInfo((prev) =>
        prev
          ? {
              ...prev,
              snapThreshold: activeSnapThreshold,
              targetAlignTo,
            }
          : prev,
      );
    }
  }, [activeSnapThreshold, targetAlignTo, debugFlag]);

  /**
   * 初始化视口监听
   */
  useEffect(() => {
    updateScreenAndScrollInfo();

    if (!hasWindow) return;

    (globalThis.window as Window).addEventListener(
      "resize",
      updateScreenAndScrollInfo,
      {
        passive: true,
      },
    );
    return () =>
      (globalThis.window as Window).removeEventListener(
        "resize",
        updateScreenAndScrollInfo,
      );
  }, [updateScreenAndScrollInfo]);

  /**
   * 同步状态到 ref
   */
  useEffect(() => {
    stateRef.current = {
      targets,
      activeTarget,
      isTargetInThreshold,
    };
  }, [targets, activeTarget, isTargetInThreshold]);

  /**
   * 监听 DOM 变化
   */
  useEffect(() => {
    if (!hasWindow || !targetSelector) return;

    const root = observerRoot || document.body;
    queryTargets();

    let mutationTimer: ReturnType<typeof setTimeout>;
    let mutationCount = 0;

    const observer = new MutationObserver((mutations) => {
      const relevantMutations = mutations.filter((m) => {
        if (m.type === "childList") return true;
        if (
          m.type === "attributes" &&
          ["style", "class"].includes(m.attributeName || "")
        ) {
          const target = m.target as HTMLElement;
          if (
            target.classList?.contains("snap-section") ||
            target.querySelector(".snap-section")
          ) {
            return true;
          }
        }
        return false;
      });

      if (relevantMutations.length === 0) return;

      clearTimeout(mutationTimer);
      mutationCount++;

      mutationTimer = setTimeout(() => {
        if (debugFlag) {
          console.log(
            `MutationObserver: Updating targets (${mutationCount} mutations batched)`,
          );
        }
        queryTargets();
        mutationCount = 0;
      }, 200);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    return () => {
      clearTimeout(mutationTimer);
      observer.disconnect();
    };
  }, [targetSelector, observerRoot, queryTargets, debugFlag]);

  /**
   * 滚动监听逻辑
   */
  useEffect(() => {
    if (!hasWindow) return;

    let isProcessing = false;

    // 计算滚动方向
    const getScrollDirection = (
      currentScrollY: number,
      lastScrollY: number,
    ): ScrollDirection => {
      if (currentScrollY > lastScrollY) return "down";
      if (currentScrollY < lastScrollY) return "up";
      return "no";
    };

    // 向下查找目标
    const findTargetDown = (
      targets: HTMLElement[],
      currentIndex: number,
      isTargetInThreshold: (el: HTMLElement) => boolean,
    ): HTMLElement | null => {
      const startIndex = currentIndex === -1 ? 0 : currentIndex + 1;
      for (let i = startIndex; i < targets.length; i++) {
        const target = targets[i];
        if (target && isTargetInThreshold(target)) {
          return target;
        }
      }
      return null;
    };

    // 向上查找目标
    const findTargetUp = (
      targets: HTMLElement[],
      currentIndex: number,
      isTargetInThreshold: (el: HTMLElement) => boolean,
    ): HTMLElement | null => {
      const startIndex =
        currentIndex === -1 ? targets.length - 1 : currentIndex - 1;
      for (let i = startIndex; i >= 0; i--) {
        const target = targets[i];
        if (target && isTargetInThreshold(target)) {
          return target;
        }
      }
      return null;
    };

    // 查找要吸附的目标
    const findTargetToSnap = (
      direction: ScrollDirection,
      targets: HTMLElement[],
      activeTarget: HTMLElement | null,
      isTargetInThreshold: (el: HTMLElement) => boolean,
    ): HTMLElement | null => {
      const currentIndex = activeTarget ? targets.indexOf(activeTarget) : -1;
      if (direction === "down") {
        return findTargetDown(targets, currentIndex, isTargetInThreshold);
      }
      if (direction === "up") {
        return findTargetUp(targets, currentIndex, isTargetInThreshold);
      }
      return null;
    };

    // 检查是否应该跳过吸附
    const shouldSkipSnap = (
      velocity: number,
      direction: ScrollDirection,
      enabledDirections: ("up" | "down")[],
    ): boolean => {
      if (velocity > FAST_SCROLL_THRESHOLD) return true;
      if (direction !== "no" && !enabledDirections.includes(direction))
        return true;
      return false;
    };

    const handleWindowScroll = () => {
      if (isProgramScrollingRef.current || isProcessing) {
        if (debugFlag) console.log("Skipped scroll processing");
        return;
      }

      isProcessing = true;

      requestAnimationFrame(() => {
        const { targets, activeTarget, isTargetInThreshold } = stateRef.current;
        if (targets.length === 0) {
          isProcessing = false;
          return;
        }

        const currentScrollY = (globalThis.window as Window).scrollY;
        const direction = getScrollDirection(
          currentScrollY,
          lastScrollYRef.current,
        );
        const velocity = Math.abs(currentScrollY - lastScrollYRef.current);

        if (debugFlag) {
          updateScreenAndScrollInfo();
          updateDebugInfo({
            isScrollingDirection: direction,
            scrollVelocity: velocity,
          });
        }

        if (shouldSkipSnap(velocity, direction, enabledDirections)) {
          lastScrollYRef.current = currentScrollY;
          isProcessing = false;
          return;
        }

        const targetToSnap = findTargetToSnap(
          direction,
          targets,
          activeTarget,
          isTargetInThreshold,
        );

        if (targetToSnap && targetToSnap !== activeTarget) {
          if (debugFlag) console.log("Found target to snap:", targetToSnap.id);
          snapToTarget(targetToSnap);
        }

        lastScrollYRef.current = currentScrollY;
        isProcessing = false;
      });
    };

    (globalThis.window as Window).addEventListener(
      "scroll",
      handleWindowScroll,
      { passive: true },
    );

    return () => {
      (globalThis.window as Window).removeEventListener(
        "scroll",
        handleWindowScroll,
      );
    };
  }, [
    debugFlag,
    enabledDirections,
    snapToTarget,
    updateScreenAndScrollInfo,
    updateDebugInfo,
  ]);

  /**
   * 初始化滚动检查
   */
  useEffect(() => {
    if (!hasWindow || targets.length === 0) return;

    const timer = setTimeout(() => {
      if (debugFlag)
        console.log("Initialization: Checking initial scroll position");
      (globalThis.window as Window).dispatchEvent(new Event("scroll"));
    }, 100);

    return () => clearTimeout(timer);
  }, [targets, debugFlag]);

  /**
   * 键盘导航支持
   */
  useEffect(() => {
    if (!hasWindow) return;

    // 检查是否在输入元素中
    const isInputElement = (e: KeyboardEvent): boolean => {
      const target = e.target as HTMLElement;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    // 获取目标索引计算函数
    const getTargetIndex = (
      key: string,
      currentIndex: number,
      length: number,
    ): number => {
      switch (key) {
        case "PageDown":
        case " ":
          return Math.min(currentIndex + 1, length - 1);
        case "PageUp":
          return Math.max(currentIndex - 1, 0);
        case "Home":
          return 0;
        case "End":
          return length - 1;
        default:
          return -1;
      }
    };

    // 获取调试日志消息
    const getDebugMessage = (key: string): string => {
      switch (key) {
        case "PageDown":
        case " ":
          return "Keyboard: PageDown/Space → Next section";
        case "PageUp":
          return "Keyboard: PageUp → Previous section";
        case "Home":
          return "Keyboard: Home → First section";
        case "End":
          return "Keyboard: End → Last section";
        default:
          return "";
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(e)) return;
      if (!activeTarget || targets.length === 0) return;

      const currentIndex = targets.indexOf(activeTarget);
      const targetIndex = getTargetIndex(e.key, currentIndex, targets.length);

      if (targetIndex === -1) return;
      if (targetIndex === currentIndex) return;

      const targetElement = targets[targetIndex];
      if (!targetElement) return;

      e.preventDefault();
      if (debugFlag) console.log(getDebugMessage(e.key));
      snapToTarget(targetElement);
    };

    (globalThis.window as Window).addEventListener("keydown", handleKeyDown);

    return () => {
      (globalThis.window as Window).removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [activeTarget, targets, snapToTarget, debugFlag]);

  /**
   * 初始化活跃目标
   */
  useEffect(() => {
    if (targets.length > 0 && !activeTarget) {
      const firstTarget = targets[0];
      if (!firstTarget) return;

      const getName = (el: HTMLElement): string | null => {
        return el.dataset.name ?? null;
      };
      setActiveTarget(firstTarget);
      updateDebugInfo({
        activeTargetId: firstTarget.id,
        activeTargetName: getName(firstTarget),
      });
    }
  }, [targets, activeTarget, updateDebugInfo]);

  // ==========================================================================
  // 返回
  // ==========================================================================

  return {
    activeTarget,
    snapToTarget,
    snapdebugInfo,
  } as WindowScrollSnapReturn;
}
