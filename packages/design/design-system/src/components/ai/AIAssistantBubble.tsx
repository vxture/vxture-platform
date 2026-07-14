"use client";

/**
 * AIAssistantBubble.tsx - AI 对话气泡
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - AI
 * @description
 *   提供 user / ai 对称布局和可替换头像，用于 AI 助手对话流。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface AIAssistantBubbleProps {
  readonly role: "user" | "ai";
  readonly children: ReactNode;
  readonly avatar?: string;
  readonly avatarSrc?: string;
  readonly timestamp?: string | Date;
  readonly className?: string;
}

export function AIAssistantBubble({
  role,
  children,
  avatar,
  avatarSrc,
  timestamp,
  className,
}: AIAssistantBubbleProps) {
  const fallbackAvatar = avatar ?? (role === "ai" ? "AI" : "U");
  const time =
    timestamp instanceof Date
      ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : timestamp;

  return (
    <div className={cn("vx-bubble", `vx-bubble--${role}`, className)}>
      <div
        className={cn("vx-bubble__avatar", `vx-bubble__avatar--${role}`)}
        aria-hidden
      >
        {avatarSrc ? <img src={avatarSrc} alt="" /> : fallbackAvatar}
      </div>
      <div className="vx-bubble__content">
        <div className="vx-bubble__body">{children}</div>
        {time ? <div className="vx-bubble__time">{time}</div> : null}
      </div>
    </div>
  );
}
