# Quantum AI 色板设计输入

来源：`packages/design/tokens-quantum-ai.css` 临时 patch。  
状态：已按完整方案迁入 DS，包含 brand ramp 替换、AI primitive、AI semantic、gradient、Tailwind bridge 与应用侧守卫；auth visual 与 shell brand 已切到 Quantum brand / aurora 语义。
约束：primitive 色阶进入 DS 与 Tailwind bridge，但应用侧仍只能消费语义 token；`pnpm lint:design` 会阻断应用直接使用 AI primitive 色阶。

```css
/* ─────────────────────────────────────────────────────────────────
   vxture Design System — Color Patch: Quantum AI (option E)
   Target file: packages/design/design-system/src/styles/tokens.css
   Version bump: v1.2.2 → v1.3.0

   How to apply (3 edits in tokens.css):

   1. Replace the existing --vx-color-brand-* primitive block (10 lines)
      with the BRAND block below.
   2. ADD the new AI / AI-CYAN / SPARK primitive blocks (3 ramps + gradients)
      anywhere inside :root, after the brand block.
   3. Replace the relevant SEMANTIC lines (primary, primary-hover, auth-accent,
      shell-brand, gradient-auth-visual-bg) with the SEMANTIC block below.

   That's it — every Button, Field, Card, Auth template, Shell, Console etc.
   reads from these tokens and updates automatically.
   ───────────────────────────────────────────────────────────────── */

/* ── 1. BRAND — replace existing brand ramp ─────────────────────── */
:root {
  --vx-color-brand-50: #eef2ff;
  --vx-color-brand-100: #dbe3ff;
  --vx-color-brand-200: #b8c5ff;
  --vx-color-brand-300: #8597ff;
  --vx-color-brand-400: #5a72ff;
  --vx-color-brand-500: #3057ff;
  --vx-color-brand-600: #1e51ff; /* PRIMARY — electric blue */
  --vx-color-brand-700: #1740d4;
  --vx-color-brand-800: #0d2eab;
  --vx-color-brand-900: #061b75;
  --vx-color-brand-950: #020a3d;
}

/* ── 2. AI VIOLET — new primitive, primary AI accent ────────────── */
:root {
  --vx-color-ai-50: #faf5ff;
  --vx-color-ai-100: #f3e8ff;
  --vx-color-ai-200: #e9d5ff;
  --vx-color-ai-300: #d8b4fe;
  --vx-color-ai-400: #c084fc;
  --vx-color-ai-500: #a855f7; /* AI ACCENT — electric violet */
  --vx-color-ai-600: #9333ea;
  --vx-color-ai-700: #7e22ce;
  --vx-color-ai-800: #6b21a8;
  --vx-color-ai-900: #581c87;
}

/* ── 3. AI CYAN — secondary AI layer (gradients / model graph) ──── */
:root {
  --vx-color-ai-cyan-50: #ecfeff;
  --vx-color-ai-cyan-100: #cffafe;
  --vx-color-ai-cyan-200: #a5f3fc;
  --vx-color-ai-cyan-300: #67e8f9;
  --vx-color-ai-cyan-400: #22d3ee;
  --vx-color-ai-cyan-500: #06b6d4; /* AI SECONDARY — electric cyan */
  --vx-color-ai-cyan-600: #0891b2;
  --vx-color-ai-cyan-700: #0e7490;
  --vx-color-ai-cyan-800: #155e75;
  --vx-color-ai-cyan-900: #164e63;
}

/* ── 4. SPARK — AI generation moment only (animations / pulses) ── */
:root {
  --vx-color-spark-50: #fffbeb;
  --vx-color-spark-100: #fef3c7;
  --vx-color-spark-200: #fde68a;
  --vx-color-spark-300: #fcd34d;
  --vx-color-spark-400: #fbbf24; /* SPARK — AI generation flash */
  --vx-color-spark-500: #f59e0b;
  --vx-color-spark-600: #d97706;
}

/* ── 5. SEMANTIC — unify primary, kill duplicates ───────────────── */
:root {
  /* Primary — points at brand-600 (was already correct, keep) */
  --vx-color-primary: var(--vx-color-brand-600);
  --vx-color-primary-hover: var(--vx-color-brand-700);
  --vx-color-primary-strong: var(--vx-color-brand-700);
  --vx-color-primary-soft: var(--vx-color-brand-100);
  --vx-color-primary-subtle: rgba(30, 81, 255, 0.08);

  /* AI semantic — applications consume these */
  --vx-color-ai: var(--vx-color-ai-500);
  --vx-color-ai-hover: var(--vx-color-ai-600);
  --vx-color-ai-surface: var(--vx-color-ai-50);
  --vx-color-ai-soft: var(--vx-color-ai-100);
  --vx-color-ai-border: rgba(168, 85, 247, 0.32);
  --vx-color-ai-foreground: var(--vx-color-ai-700);

  --vx-color-ai-cyan: var(--vx-color-ai-cyan-500);
  --vx-color-ai-cyan-soft: var(--vx-color-ai-cyan-100);

  /* Spark — generation moments only, never static UI */
  --vx-color-spark: var(--vx-color-spark-400);
  --vx-color-spark-soft: var(--vx-color-spark-100);

  /* Auth — kill duplicates: point at brand */
  --vx-color-auth-accent: var(--vx-color-brand-600);
  --vx-color-auth-accent-light: var(--vx-color-brand-500);
  --vx-color-auth-border: rgba(30, 81, 255, 0.12);
  --vx-color-auth-border-active: rgba(30, 81, 255, 0.55);
  --vx-color-auth-visual-bg: var(--vx-gradient-aurora);
  --vx-color-auth-node-rgb: 168 85 247; /* violet for left-panel node graph */

  /* Shell — kill duplicate: point at brand */
  --vx-color-shell-brand: var(--vx-color-brand-600);

  /* Borders & rings — recalibrate to new brand hue */
  --vx-color-border: rgba(30, 81, 255, 0.1);
  --vx-color-border-strong: rgba(30, 81, 255, 0.32);
  --vx-color-ring: rgba(30, 81, 255, 0.12);
  --vx-color-ring-strong: rgba(30, 81, 255, 0.55);
}

/* ── 6. GRADIENTS — brand signature visuals ─────────────────────── */
:root {
  /* Aurora — brand hero / login visual panel / AI chrome */
  --vx-gradient-aurora: linear-gradient(
    135deg,
    #020a3d 0%,
    #1e51ff 35%,
    #a855f7 72%,
    #06b6d4 100%
  );

  /* Deep-blue — sub-brand, less AI, for non-AI surfaces */
  --vx-gradient-brand: linear-gradient(
    145deg,
    #061b75 0%,
    #1740d4 50%,
    #1e51ff 100%
  );

  /* AI duo — for badges, AI assistant chrome (no third color) */
  --vx-gradient-ai-duo: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);

  /* Spark pulse — only for generation animations */
  --vx-gradient-spark-pulse: radial-gradient(
    circle,
    rgba(251, 191, 36, 0.6) 0%,
    rgba(251, 191, 36, 0) 70%
  );
}

/* ── 7. @theme MAPPING — additions for Tailwind v4 ──────────────── */
/* Add these inside the existing @theme block at the top of tokens.css */
/*
@theme {
  --color-vx-ai-50:  var(--vx-color-ai-50);
  --color-vx-ai-100: var(--vx-color-ai-100);
  --color-vx-ai-500: var(--vx-color-ai-500);
  --color-vx-ai-600: var(--vx-color-ai-600);
  --color-vx-ai-700: var(--vx-color-ai-700);
  --color-vx-ai:     var(--vx-color-ai);

  --color-vx-ai-cyan-100: var(--vx-color-ai-cyan-100);
  --color-vx-ai-cyan-500: var(--vx-color-ai-cyan-500);
  --color-vx-ai-cyan:     var(--vx-color-ai-cyan);

  --color-vx-spark-100: var(--vx-color-spark-100);
  --color-vx-spark-400: var(--vx-color-spark-400);
  --color-vx-spark:     var(--vx-color-spark);
}
*/

/* ─────────────────────────────────────────────────────────────────
   USAGE RULES (document these in standards/design-system.md)
   ─────────────────────────────────────────────────────────────────

   --vx-color-primary    Product chrome: CTA buttons, links, focus rings,
                         active nav, primary brand visuals. ~70% of all
                         "blue" usage in the product.

   --vx-color-ai         AI-specific UI only:
                         · Model badges and chips
                         · AI assistant chrome (chat panel, suggestion)
                         · "Generated by AI" indicators
                         · AI-related navigation entries
                         Never for generic CTAs.

   --vx-color-ai-cyan    Layering / decoration with --vx-color-ai:
                         · Gradient bottom half
                         · Model graph secondary lines
                         · AI badge inner glow
                         Never used alone — always paired with ai-500.

   --vx-color-spark      Animation moments only:
                         · "Generating…" pulse
                         · Completion flash
                         · Token-stream sparkle
                         Never on static surfaces.

   --vx-gradient-aurora  Brand signature. Use sparingly:
                         · Login visual panel
                         · Marketing hero
                         · AI agent landing
                         One per screen max.
   ───────────────────────────────────────────────────────────────── */
```
