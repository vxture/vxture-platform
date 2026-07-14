"use client";

/**
 * AnimatedHeroBg.tsx - 营销页 Hero 区块动态背景
 *
 * 功能：动态节点连线 + 网格叠层 + 横向扫描光效，支持亮/暗双主题
 * 效果参考控制台登录页左侧视觉面板，适配宽幅 Hero 区块
 *
 * @package @vxture/website
 * @layer Presentation
 * @category Components - Marketing
 * @author AI-Generated
 * @date 2026-05-06
 */

import { useEffect, useRef } from "react";
import { useTheme } from "@vxture/design-system";

function readHeroCanvasPalette() {
  const styles = getComputedStyle(document.documentElement);
  const nodeRgb = styles.getPropertyValue("--vx-color-hero-node-rgb").trim();
  const lineRgb = styles.getPropertyValue("--vx-color-hero-line-rgb").trim();

  return {
    node: (alpha: number) => `rgb(${nodeRgb} / ${alpha})`,
    line: (alpha: number) => `rgb(${lineRgb} / ${alpha})`,
    scanColor: styles.getPropertyValue("--vx-color-hero-scan").trim(),
  };
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────

/**
 * 全屏自适应动态背景，放在 Hero section 内 absolute inset-0 容器即可
 */
export default function AnimatedHeroBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ─── Canvas 动画 ───────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = readHeroCanvasPalette();
    let raf = 0;
    let width = 0;
    let height = 0;
    let scanY = 0;

    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      phase: number;
    };
    let nodes: Node[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(32, Math.floor((width * height) / 8500));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.6,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const LINK_DIST = 150;
    const SCAN_SPEED = 0.5;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseRef.current;

      // 更新节点位置（含鼠标排斥）
      for (const n of nodes) {
        n.phase += 0.012;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 100) {
          n.x += (dx / d) * 0.5;
          n.y += (dy / d) * 0.5;
        }
      }

      // 绘制节点连线
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = palette.line((1 - d / LINK_DIST) * 0.28);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // 绘制节点（带脉冲缩放）
      for (const n of nodes) {
        const pulse = Math.sin(n.phase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1 + pulse * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = palette.node(0.4 + pulse * 0.4);
        ctx.fill();
      }

      // 绘制下降横向扫描线
      scanY = (scanY + SCAN_SPEED) % height;
      const scanGrad = ctx.createLinearGradient(0, 0, width, 0);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, palette.scanColor);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY, width, 1.5);

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [isDark]);

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 渐变底色 */}
      <div className="vx-hero-bg-layer absolute inset-0" />

      {/* 节点连线动画层 */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 网格叠层 */}
      <div className="vx-hero-grid-layer absolute inset-0" />

      {/* 底部向下渐隐，与页面内容区平滑过渡 */}
      <div className="vx-hero-fade-layer absolute bottom-0 left-0 right-0 h-28" />
    </div>
  );
}
