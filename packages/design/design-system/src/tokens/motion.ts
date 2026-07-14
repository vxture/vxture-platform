/**
 * motion.ts - 动画 Tokens
 * @package @vxture/design-system
 *
 * 功能：定义设计系统的动画 tokens，包括缓动函数、持续时间等
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Tokens
 */

export const easing = {
  linear: "var(--vx-ease-linear)",
  standard: "var(--vx-ease-standard)",
  out: "var(--vx-ease-out)",
  in: "var(--vx-ease-in)",
  inOut: "var(--vx-ease-in-out)",
  snappy: "var(--vx-ease-snappy)",
} as const;

export const duration = {
  instant: "var(--vx-duration-instant)",
  fast: "var(--vx-duration-fast)",
  base: "var(--vx-duration-base)",
  moderate: "var(--vx-duration-moderate)",
  slow: "var(--vx-duration-slow)",
  slower: "var(--vx-duration-slower)",
  spinner: "var(--vx-duration-spinner)",
  pulse: "var(--vx-duration-pulse)",
  shimmer: "var(--vx-duration-shimmer)",
} as const;

export const motion = {
  buttonHover: "var(--vx-motion-button-hover)",
  cardLift: "var(--vx-motion-card-lift)",
  modalOpen: "var(--vx-motion-modal-open)",
  dropdownOpen: "var(--vx-motion-dropdown-open)",
  tooltipOpen: "var(--vx-motion-tooltip-open)",
  aiPop: "var(--vx-motion-ai-pop)",
  spinner: "var(--vx-motion-spinner)",
  pulse: "var(--vx-motion-pulse)",
} as const;

export const animation = {
  spin: "var(--animate-vx-spin)",
  pulse: "var(--animate-vx-pulse)",
  fadeIn: "var(--animate-vx-fade-in)",
  fadeUp: "var(--animate-vx-fade-up)",
  scaleIn: "var(--animate-vx-scale-in)",
  shimmer: "var(--animate-vx-shimmer)",
} as const;

export const motionPresets = {
  fadeIn: {
    duration: duration.base,
    easing: easing.out,
  },
  slideIn: {
    duration: duration.moderate,
    easing: easing.out,
  },
  scaleIn: {
    duration: duration.base,
    easing: easing.snappy,
  },
  bounce: {
    duration: duration.slow,
    easing: easing.snappy,
  },
  elastic: {
    duration: duration.slower,
    easing: easing.snappy,
  },
} as const;
