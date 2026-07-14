# Virtual Nature Studio 字体体系设计与规范化应用要求

版本：v1.0  
日期：2026-05-08  
适用对象：AI SaaS 官网、产品控制台、文档中心、营销物料、中文与中英文混排界面  
品牌字体决策：**Funnel Display 作为主品牌字体**

---

## 0. 结论

Virtual Nature Studio 的字体体系采用 **“品牌字体 + 产品字体 + 中文字体 + 等宽字体”** 的分层架构。

```text
Brand / Display: Funnel Display
Product UI / Body: Inter
Chinese / CJK: Noto Sans SC + 系统中文 fallback
Mono / Code: Geist Mono + system mono fallback
```

一句话规范：

```text
Funnel Display 负责品牌记忆点，Inter 负责产品可读性，Noto Sans SC 负责中文稳定性，Geist Mono 负责代码和数据场景。
```

不建议全站只使用 Funnel Display。Funnel Display 应作为品牌与展示层字体使用；正文、控制台、表单、数据密集页面应使用 Inter 与中文 fallback，以保证长期阅读和复杂 UI 的稳定性。

---

## 1. 设计原则

### 1.1 大厂字体策略参考

成熟科技品牌通常不会用一个字体覆盖所有场景，而是使用具备明确职责的字体系统。

| 品牌 / 体系      | 字体策略                                                                         | 可借鉴点                                             |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Apple            | San Francisco 作为系统字体，强调一致、清晰、友好，以及不同字号下的可读性         | 产品字体要服务于界面可读性，而不是只追求风格         |
| Microsoft Fluent | Web 使用 Segoe UI；Windows 使用 Segoe UI Variable；通过 type ramp 定义语义化层级 | 字号、行高、字重应语义化，而不是临时手调             |
| Vercel           | Geist 面向开发者和设计师，包含 Sans、Mono、Pixel 等子族                          | SaaS / Developer Tool 需要单独规划代码字体与界面字体 |
| IBM              | IBM Plex 是全球化、通用、具有品牌辨识度的企业字体体系                            | 品牌字体需要兼顾多语言、多媒介和长期维护             |
| OpenAI           | OpenAI Sans 强调几何精度、功能性和圆润亲和                                       | AI 品牌字体不应过冷，应兼具科技感与亲和感            |
| Google / Noto    | Noto 覆盖多语言文字系统                                                          | 中文与国际化不应依赖单一拉丁字体 fallback            |

Virtual Nature Studio 的方向是：

```text
AI / virtual / creative / nature / studio
```

因此字体体系应同时满足：

1. 有 AI SaaS 的几何科技感。
2. 有 nature / studio 的柔和与创作感。
3. 能稳定处理中文、英文、中英文混排、数字、代码、API、Dashboard。
4. 有明确的开发落地规则，避免设计稿与代码实现漂移。

---

## 2. 字体角色架构

### 2.1 字体角色定义

| Token            | 字体                     | 角色         | 主要场景                                   | 使用优先级 |
| ---------------- | ------------------------ | ------------ | ------------------------------------------ | ---------: |
| `--font-brand`   | Funnel Display           | 品牌字体     | Logo、品牌名、Hero 主标题、营销页大标题    |         P0 |
| `--font-display` | Funnel Display           | 展示标题字体 | Landing Page、Section Title、Campaign 标题 |         P0 |
| `--font-sans`    | Inter + CJK fallback     | 产品通用字体 | 正文、按钮、导航、表单、产品界面           |         P0 |
| `--font-cjk`     | Noto Sans SC + 系统中文  | 中文专用字体 | 中文正文、帮助文档、中文标题、中文界面     |         P0 |
| `--font-mono`    | Geist Mono + system mono | 等宽字体     | 代码、API Key、JSON、Prompt、日志、命令行  |         P1 |
| `--font-number`  | Inter                    | 数字场景     | 价格、指标、表格数字、Dashboard            |         P1 |

### 2.2 核心决策

#### Funnel Display 不承担全站正文

Funnel Display 是品牌字体，不是全场景 UI 字体。它用于建立 Virtual Nature Studio 的第一视觉印象：科技、几何、未来、创作感。

允许使用 Funnel Display 的场景：

```text
Logo
Hero Title
首页主标语
Marketing Page 大标题
Feature Section 标题
品牌短句
社交媒体海报标题
```

不建议使用 Funnel Display 的场景：

```text
大段正文
帮助中心长文
复杂表单
Dashboard 表格
小字号说明文字
密集导航
中文长句
```

#### Inter 是产品工作字体

Inter 用于产品界面和正文内容，负责可读性和 UI 稳定性。

典型场景：

```text
body
button
nav
tab
input
textarea
card
modal
tooltip
table
pricing copy
FAQ
文档正文
```

#### Noto Sans SC 是中文稳定层

Funnel Display 与 Inter 主要解决拉丁字符体验，中文需要独立 fallback 策略。

中文优先顺序：

```text
Noto Sans SC → PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC → system sans-serif
```

说明：

- `Noto Sans SC` 负责跨平台一致性。
- `PingFang SC` 负责 macOS / iOS 中文系统体验。
- `Microsoft YaHei` 负责 Windows 中文 fallback。
- 中文不要被迫套用 Funnel Display 的 tracking 规则。

#### Geist Mono 用于技术表达

AI SaaS 往往会出现 Prompt、API、JSON、模型名、日志、命令行。等宽字体应独立定义，不要混用正文 sans。

典型场景：

```text
API key
model id
prompt editor
JSON preview
CLI command
logs
code snippet
```

---

## 3. CSS Token 规范

### 3.1 Tailwind v4 `@theme` 推荐写法

```css
@import "tailwindcss";

@theme {
  --font-brand:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;

  --font-display:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;

  --font-sans:
    "Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

  --font-cjk:
    "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
    "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif;

  --font-mono:
    "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}
```

### 3.2 普通 CSS 变量写法

```css
:root {
  --font-brand:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
  --font-display:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
  --font-sans:
    "Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-cjk:
    "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
    "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif;
  --font-mono:
    "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}
```

### 3.3 全局基础规则

```css
html {
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
}

code,
pre,
kbd,
samp,
.api-token,
.prompt-text,
.model-id {
  font-family: var(--font-mono);
}

[lang="zh-CN"],
.prose-cn,
.cjk-text {
  font-family: var(--font-cjk);
}

.price,
.metric,
.table-number,
.stat-number {
  font-variant-numeric: tabular-nums;
}
```

---

## 4. 字体加载策略

### 4.1 加载优先级

| 优先级  | 字体           | 建议加载方式                         | 说明                                     |
| ------- | -------------- | ------------------------------------ | ---------------------------------------- |
| P0      | Funnel Display | preload / self-host / variable font  | 首屏品牌字体，影响第一印象               |
| P0      | Inter          | self-host / variable font            | 全站 UI 与正文主力字体                   |
| P1      | Geist Mono     | 按需加载或全局轻量加载               | 代码、API、Prompt 场景                   |
| P1 / P2 | Noto Sans SC   | 谨慎加载；优先系统 fallback 或子集化 | CJK 文件较大，避免一次加载完整字体全家桶 |

### 4.2 性能要求

1. 首屏最多 preload 1 个品牌字体文件。
2. 优先使用 `woff2`。
3. 所有 Web Font 必须设置 `font-display: swap`。
4. 不要在首屏同时加载 Funnel Display、Inter、Noto Sans SC 多字重完整文件。
5. 中文字体按需加载，优先使用系统中文 fallback；确有品牌一致性要求时再引入 Noto Sans SC。
6. 字重控制在有限范围：

```text
Funnel Display: 400 / 500 / 600 / 700 / 800
Inter: 400 / 500 / 600 / 700 / 800 / 900
Noto Sans SC: 400 / 500 / 700
Geist Mono: 400 / 500 / 600
```

7. 营销页可以加载 Funnel Display 更重字重；产品控制台不应加载过多展示字体。
8. 对中文长文页，允许优先使用系统中文字体，降低首屏字体资源压力。

### 4.3 `@font-face` 示例

```css
@font-face {
  font-family: "Funnel Display";
  src: url("/fonts/funnel-display-variable.woff2") format("woff2");
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Geist Mono";
  src: url("/fonts/geist-mono-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

中文字体如需自托管，应采用子集化或按语言加载：

```css
@font-face {
  font-family: "Noto Sans SC";
  src: url("/fonts/noto-sans-sc-regular-subset.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+4E00-9FFF, U+3000-303F, U+FF00-FFEF;
}
```

---

## 5. 语义化字体层级

### 5.1 Typography Scale

| Token          | 字体                   |      字重 |                      字号 | 行高 |       字距 | 用途             |
| -------------- | ---------------------- | --------: | ------------------------: | ---: | ---------: | ---------------- |
| `display-hero` | Funnel Display         |       800 | `clamp(56px, 8vw, 128px)` | 0.95 | `-0.048em` | 首页 Hero 主标题 |
| `display-xl`   | Funnel Display         |       800 |  `clamp(44px, 6vw, 88px)` | 0.98 | `-0.045em` | 营销页大标题     |
| `display-lg`   | Funnel Display         |       700 |                    `48px` | 1.02 |  `-0.04em` | 页面主标题       |
| `heading-1`    | Funnel Display / Inter |       700 |                    `40px` |  1.1 | `-0.035em` | H1               |
| `heading-2`    | Funnel Display / Inter |       700 |                    `32px` | 1.15 | `-0.025em` | H2               |
| `heading-3`    | Inter                  |       600 |                    `24px` | 1.25 | `-0.015em` | H3 / 卡片标题    |
| `body-lg`      | Inter                  | 400 / 500 |                    `18px` |  1.7 |        `0` | 营销页段落       |
| `body`         | Inter                  |       400 |                    `16px` |  1.6 |        `0` | 正文 / UI        |
| `body-sm`      | Inter                  | 400 / 500 |                    `14px` | 1.55 |        `0` | 辅助说明         |
| `caption`      | Inter                  |       500 |                    `12px` | 1.45 |   `0.01em` | 标签 / 说明      |
| `cjk-body`     | Noto Sans SC           |       400 |                    `16px` | 1.75 |   `0.01em` | 中文正文         |
| `cjk-heading`  | Noto Sans SC           | 600 / 700 |                    `32px` | 1.25 |        `0` | 中文标题         |
| `code`         | Geist Mono             |       400 |                    `13px` | 1.55 |        `0` | 代码 / API       |

### 5.2 CSS 类建议

```css
.text-display-hero {
  font-family: var(--font-brand);
  font-size: clamp(3.5rem, 8vw, 8rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.048em;
}

.text-display-xl {
  font-family: var(--font-display);
  font-size: clamp(2.75rem, 6vw, 5.5rem);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.text-heading-1 {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 4vw, 3.5rem);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.text-heading-2 {
  font-family: var(--font-display);
  font-size: clamp(1.875rem, 3vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.text-body {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0;
}

.text-cjk-body {
  font-family: var(--font-cjk);
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.75;
  letter-spacing: 0.01em;
}

.text-code {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.55;
}
```

---

## 6. 品牌场景规范

### 6.1 Logo / Wordmark

推荐写法：

```text
virtual nature studio
```

或：

```text
Virtual Nature Studio
```

建议优先级：

| 形态                    | 推荐度 | 说明                                  |
| ----------------------- | -----: | ------------------------------------- |
| `virtual nature studio` |     高 | 更像创意工作室、生成式自然影像品牌    |
| `Virtual Nature Studio` |     高 | 更像 AI SaaS / B2B 品牌               |
| `VIRTUAL NATURE STUDIO` |     中 | 可以用于徽章、标签，不建议作为主 logo |
| `VirtualNatureStudio`   |     低 | 可读性下降，不建议                    |

Logo CSS：

```css
.logo-text {
  font-family: var(--font-brand);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1;
}
```

大尺寸 wordmark：

```css
.logo-text-large {
  font-family: var(--font-brand);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.95;
}
```

### 6.2 Hero Title

推荐排版：

```text
Virtual Nature
Studio
```

或保留全小写：

```text
virtual nature
studio
```

Hero Title 规则：

1. 使用 `Funnel Display 800`。
2. 字距使用 `-0.045em` 到 `-0.06em`。
3. 行高使用 `0.95` 到 `0.98`。
4. 不要在 Hero Title 中混入过长中文句子。
5. 若需要中文副标题，中文副标题单独成行，使用 `Noto Sans SC / Inter stack`。

示例：

```html
<h1 class="text-display-hero">Virtual Nature<br />Studio</h1>

<p class="text-cjk-body">用 AI 生成自然场景、环境视觉与虚拟空间资产。</p>
```

### 6.3 中文品牌副标题

中文副标题不使用 Funnel Display 的紧字距规则。

```css
.brand-subtitle-cn {
  font-family: var(--font-cjk);
  font-size: clamp(1rem, 2vw, 1.25rem);
  font-weight: 400;
  line-height: 1.75;
  letter-spacing: 0.01em;
}
```

---

## 7. 产品 UI 场景规范

### 7.1 导航

导航使用 Inter，不使用 Funnel Display。

```css
.nav-item {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
```

原因：导航需要快速扫描，不应过度品牌化。

### 7.2 按钮

按钮使用 Inter 500 / 600。

```css
.button {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
```

营销页主 CTA 可允许 Funnel Display，但只限短按钮，例如：

```text
Create Now
Start Studio
Explore Nature AI
```

产品控制台按钮不使用 Funnel Display。

### 7.3 表单

表单统一使用 Inter + CJK fallback。

```css
.input,
.textarea,
.select {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}
```

Placeholder 不应使用过轻字重；最低使用 400。

### 7.4 Card / Modal / Dropdown

标题：Inter 600。  
正文：Inter 400。  
标签：Inter 500。  
不要在复杂组件内同时混用 Funnel Display 与 Inter。

```css
.card-title {
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.card-description {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}
```

---

## 8. 中文与中英文混排规范

### 8.1 混排原则

1. 英文品牌名可以使用 Funnel Display。
2. 中文正文不使用 Funnel Display。
3. 中英文混排长句使用 `--font-sans`，不要使用 `--font-brand`。
4. 短品牌标题可分 span，英文 Funnel Display，中文 Noto Sans SC。
5. 中文行高比英文更大，正文建议 `1.7` 到 `1.85`。
6. 中文不要使用过大的负字距。

### 8.2 推荐结构

```html
<h1 class="hero-title">
  <span class="font-brand">Virtual Nature Studio</span>
  <span class="font-cjk">虚拟自然影像工作台</span>
</h1>
```

对应 CSS：

```css
.hero-title .font-brand {
  font-family: var(--font-brand);
  font-weight: 800;
  letter-spacing: -0.048em;
  line-height: 0.95;
}

.hero-title .font-cjk {
  display: block;
  font-family: var(--font-cjk);
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.4;
}
```

### 8.3 不推荐写法

不要这样：

```html
<h1 class="font-brand tracking-tight">
  Virtual Nature Studio 是一个 AI 自然场景生成平台
</h1>
```

原因：

- 中文会 fallback 到中文字体，但继承 Funnel Display 的负字距和展示级行高。
- 中文可读性下降。
- 混排节奏不稳定。

推荐：

```html
<h1 class="font-brand tracking-brand-tight">Virtual Nature Studio</h1>

<p class="font-cjk leading-loose">
  一个用于生成自然场景、环境视觉与虚拟空间资产的 AI Studio。
</p>
```

### 8.4 中英文之间空格

产品文案中，中文与英文品牌词之间建议保留空格：

```text
使用 Virtual Nature Studio 创建自然场景。
```

不要写成：

```text
使用Virtual Nature Studio创建自然场景。
```

UI 标签空间不足时可以例外。

---

## 9. 数字、价格和 Dashboard 规范

### 9.1 数字字体

数字使用 Inter，并启用 tabular numbers。

```css
.numeric,
.price,
.metric,
.table-number {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
}
```

### 9.2 价格展示

```css
.price-value {
  font-family: var(--font-sans);
  font-size: clamp(2rem, 4vw, 4rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
}

.price-unit {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
```

### 9.3 表格数字

```css
.data-table {
  font-family: var(--font-sans);
  font-size: 14px;
}

.data-table td.numeric {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
```

---

## 10. 代码、Prompt 和 API 规范

### 10.1 使用场景

必须使用 `--font-mono` 的内容：

```text
code block
inline code
API key
model id
JSON
YAML
CLI
prompt editor
log output
system message
```

### 10.2 代码样式

```css
code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  font-weight: 400;
}

pre {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
}

.api-token {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: -0.01em;
}
```

### 10.3 Prompt 编辑器

Prompt 编辑器如果以自然语言为主，使用 Inter；如果以结构化 prompt / JSON / 参数为主，使用 Geist Mono。

```text
自然语言 Prompt → Inter
结构化 Prompt / 参数模板 → Geist Mono
```

---

## 11. Tailwind 应用规范

### 11.1 推荐工具类

如果使用 Tailwind v4，并已定义 `@theme`，则会生成：

```text
font-brand
font-display
font-sans
font-cjk
font-mono
```

示例：

```html
<h1
  class="font-brand text-7xl font-extrabold tracking-[-0.048em] leading-[0.95]"
>
  Virtual Nature Studio
</h1>

<p class="font-sans text-base leading-7">
  Create natural AI scenes, environments, and visual systems.
</p>

<p class="font-cjk text-base leading-8 tracking-[0.01em]">
  用 AI 生成自然场景、环境视觉与虚拟空间资产。
</p>

<code class="font-mono text-sm"> model: virtual-nature-v1 </code>
```

### 11.2 组件级规范

| 组件         | Font Class     |    Weight |                Tracking |
| ------------ | -------------- | --------: | ----------------------: |
| Logo         | `font-brand`   | 700 / 800 | `-0.025em` 到 `-0.04em` |
| Hero Title   | `font-brand`   |       800 | `-0.04em` 到 `-0.048em` |
| Marketing H2 | `font-display` |       700 | `-0.025em` 到 `-0.04em` |
| Product H1   | `font-sans`    |       700 |              `-0.025em` |
| Body         | `font-sans`    |       400 |                     `0` |
| CN Body      | `font-cjk`     |       400 |                `0.01em` |
| Button       | `font-sans`    |       600 |                     `0` |
| Code         | `font-mono`    | 400 / 500 |                     `0` |
| Metric       | `font-sans`    | 600 / 700 |          `tabular-nums` |

### 11.3 禁止项

禁止在业务代码中直接写：

```css
font-family: Arial;
font-family: Helvetica;
font-family: sans-serif;
font-family: "Microsoft YaHei";
```

必须使用 token：

```css
font-family: var(--font-sans);
font-family: var(--font-brand);
font-family: var(--font-cjk);
font-family: var(--font-mono);
```

---

## 12. 页面类型规范

### 12.1 官网首页

| 区域          | 字体                 |
| ------------- | -------------------- |
| Logo          | Funnel Display       |
| Navigation    | Inter                |
| Hero Title    | Funnel Display       |
| Hero Subtitle | Inter / Noto Sans SC |
| CTA           | Inter 600            |
| Section Title | Funnel Display       |
| Feature Card  | Inter                |
| Footer        | Inter                |

### 12.2 营销页 / Landing Page

允许更强品牌化：

```text
Funnel Display 使用比例：高
Inter 使用比例：中
Noto Sans SC：按中文内容需要
```

规则：

1. 大标题使用 Funnel Display。
2. 长段落使用 Inter。
3. 中文正文使用 Noto Sans SC stack。
4. 每屏最多 2 种字体角色同时出现。

### 12.3 产品控制台 / Dashboard

控制台以效率和可读性为主：

```text
Funnel Display 使用比例：低
Inter 使用比例：高
Geist Mono：按技术内容需要
Noto Sans SC：按中文内容需要
```

规则：

1. 除品牌标识外，控制台不使用 Funnel Display。
2. 表格、表单、导航、筛选器统一 Inter。
3. 数据数字使用 tabular nums。
4. 代码与模型参数使用 Geist Mono。

### 12.4 文档中心 / Docs

| 内容     | 字体                            |
| -------- | ------------------------------- |
| 文档标题 | Inter 700 或 Funnel Display 700 |
| 文档正文 | Inter / Noto Sans SC            |
| 代码块   | Geist Mono                      |
| API 参数 | Geist Mono                      |
| 表格     | Inter                           |

规则：

1. 文档阅读优先，不追求强品牌视觉。
2. 英文文档正文使用 Inter。
3. 中文文档正文使用 Noto Sans SC stack。
4. 代码块与 inline code 必须使用 mono。

### 12.5 Blog / Help Center

中文长文优先：

```text
font-family: var(--font-cjk);
line-height: 1.75;
font-size: 16px 或 17px;
```

英文长文优先：

```text
font-family: var(--font-sans);
line-height: 1.65;
font-size: 16px 或 18px;
```

---

## 13. Figma / Design Token 命名规范

### 13.1 字体族命名

```text
Font / Brand / Funnel Display
Font / Display / Funnel Display
Font / Sans / Inter
Font / CJK / Noto Sans SC
Font / Mono / Geist Mono
```

### 13.2 文本样式命名

```text
Display/Hero
Display/XL
Display/LG
Heading/H1
Heading/H2
Heading/H3
Body/LG
Body/MD
Body/SM
Body/CN
Caption/MD
Code/MD
Metric/LG
```

### 13.3 设计与代码映射

| Figma Style    | CSS Class            | Font Token                   |
| -------------- | -------------------- | ---------------------------- |
| `Display/Hero` | `.text-display-hero` | `--font-brand`               |
| `Display/XL`   | `.text-display-xl`   | `--font-display`             |
| `Heading/H1`   | `.text-heading-1`    | `--font-display`             |
| `Body/MD`      | `.text-body`         | `--font-sans`                |
| `Body/CN`      | `.text-cjk-body`     | `--font-cjk`                 |
| `Code/MD`      | `.text-code`         | `--font-mono`                |
| `Metric/LG`    | `.text-metric-lg`    | `--font-sans` + tabular nums |

---

## 14. 可访问性要求

1. 正文最小字号建议 `16px`。
2. 辅助文字最低不小于 `12px`，移动端不小于 `13px`。
3. 中文正文行高不低于 `1.65`，推荐 `1.75`。
4. 英文正文行高推荐 `1.55` 到 `1.7`。
5. 大标题负字距只允许用于拉丁字符标题，不应用于中文长句。
6. 不使用过轻字重作为正文，最低使用 400。
7. 不使用全大写长句作为正文或导航。
8. 数字与单位之间保持清晰间隔，例如 `$29 / month`、`120 credits`。
9. 代码块字号不低于 `12px`。
10. 允许用户缩放页面，不应因固定行高导致文字遮挡。

---

## 15. 国际化与语言属性

### 15.1 HTML lang

必须设置页面语言：

```html
<html lang="zh-CN"></html>
```

英文页面：

```html
<html lang="en"></html>
```

局部混排：

```html
<p lang="zh-CN">用 AI 创建自然场景。</p>
<p lang="en">Create natural AI scenes.</p>
```

### 15.2 CSS 语言选择器

```css
:lang(zh-CN) {
  font-family: var(--font-cjk);
  line-height: 1.75;
}

:lang(en) {
  font-family: var(--font-sans);
}
```

注意：不要让 `:lang(zh-CN)` 覆盖 Logo 内的英文品牌名。品牌名应单独使用 `.font-brand`。

---

## 16. 品牌落地示例

### 16.1 首页首屏

```html
<header class="site-header">
  <a class="logo-text" href="/">virtual nature studio</a>
  <nav class="nav-item">Product</nav>
</header>

<section class="hero">
  <h1 class="text-display-hero">Virtual Nature<br />Studio</h1>
  <p class="text-cjk-body">用 AI 生成自然场景、环境视觉与虚拟空间资产。</p>
</section>
```

### 16.2 产品控制台

```html
<aside class="font-sans">
  <div class="logo-text">vns</div>
  <nav>Projects</nav>
</aside>

<main class="font-sans">
  <h1 class="text-heading-product">Scene Generator</h1>
  <p class="text-body">
    Create and manage your generated natural environments.
  </p>

  <code class="font-mono">model: virtual-nature-v1</code>
</main>
```

### 16.3 中文文档

```html
<article class="prose-cn">
  <h1>快速开始</h1>
  <p>使用 Virtual Nature Studio 创建第一个自然场景。</p>
  <pre><code>npm install @vns/sdk</code></pre>
</article>
```

---

## 17. Governance：字体系统治理要求

### 17.1 谁可以修改字体体系

字体体系属于品牌与设计系统基础资产，修改需要经过：

```text
Brand Owner / Design Lead / Frontend Lead
```

不得由单个页面、单个组件、单个活动页随意改变全局字体 token。

### 17.2 新增字体的审批条件

只有满足以下条件之一，才允许新增字体：

1. 新语言系统无法被现有 fallback 覆盖。
2. 新品牌活动需要明确的临时字体，并有结束时间。
3. 产品新增代码编辑器、数据密集工作台等特殊场景。
4. 法务或授权问题导致现有字体不能继续使用。

### 17.3 新增字体必须提供

```text
字体名称
使用场景
授权说明
加载范围
文件大小
字重数量
fallback 方案
替代方案
移除条件
```

### 17.4 禁止行为

1. 页面内直接引入第三方字体 CDN。
2. 在组件 CSS 中硬编码非 token 字体。
3. 为单个按钮引入新字体。
4. 在首屏加载完整中文字体全字重。
5. 中文正文套用 Funnel Display 的展示级负字距。
6. 在 Dashboard 表格中使用品牌展示字体。
7. 在代码块中使用普通 sans 字体。

---

## 18. QA 检查清单

上线前检查：

```text
[ ] Logo / Hero 是否使用 Funnel Display？
[ ] 正文是否使用 Inter 或 CJK stack？
[ ] 中文长文是否避免 Funnel Display tracking？
[ ] 中英文混排是否有合理空格？
[ ] 表格数字是否启用 tabular-nums？
[ ] API / Code 是否使用 mono？
[ ] 是否只 preload 必要字体？
[ ] 是否设置 font-display: swap？
[ ] CJK 字体是否避免全量多字重加载？
[ ] 移动端字号是否可读？
[ ] 设计稿字体样式是否映射到代码 token？
[ ] 是否没有硬编码 Arial / Helvetica / Microsoft YaHei？
```

### 18.1 Funnel Display 迁移验收

迁移完成必须满足：

```text
[ ] DS `typography.css` 的 `--vx-font-brand` / `--vx-font-display` fallback 已从旧品牌字体切到 Funnel Display。
[ ] DS `typography.css` 已完成 6 项展示层 metric 校准：logo / logo-large letter-spacing，display-hero line-height / letter-spacing，display-xl line-height / letter-spacing。
[ ] 所有 Next.js `app/layout.tsx` 已通过 `Funnel_Display`、`Inter`、`Geist_Mono` 加载字体变量。
[ ] 如使用 Google Fonts `<link>`，URL 必须使用 `family=Funnel+Display`，不得继续加载旧品牌字体。
[ ] 应用侧不得直接写字体族，必须使用 `--font-brand`、`--font-display`、`--font-sans`、`--font-cjk`、`--font-mono`。
[ ] `packages/design/typography-funnel-display.css` 这类临时迁移文件已删除；正式来源只认 DS `typography.css`、应用 `layout.tsx` 字体加载器和本文档。
```

验收命令：

```bash
rg -n -g "*.ts" -g "*.tsx" -g "*.css" -g "*.html" -- "Sora|font-family:.*Sora|family=Sora" portals agent-studio business packages/design/design-system
pnpm lint:design
pnpm --filter @vxture/design-system lint
pnpm --filter @vxture/design-system type-check
pnpm --filter @vxture/design-system build
```

---

## 19. 推荐文件结构

```text
src/
  styles/
    fonts.css
    typography.css
    tokens.css
  components/
    typography/
      Heading.tsx
      Text.tsx
      Code.tsx
      Metric.tsx
  app/
    layout.tsx
public/
  fonts/
    funnel-display-variable.woff2
    inter-variable.woff2
    geist-mono-variable.woff2
    noto-sans-sc-regular-subset.woff2
```

---

## 20. `fonts.css` 建议模板

```css
@font-face {
  font-family: "Funnel Display";
  src: url("/fonts/funnel-display-variable.woff2") format("woff2");
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Geist Mono";
  src: url("/fonts/geist-mono-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-brand:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
  --font-display:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
  --font-sans:
    "Inter", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-cjk:
    "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
    "Noto Sans CJK SC", ui-sans-serif, system-ui, sans-serif;
  --font-mono:
    "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}
```

---

## 21. `typography.css` 建议模板

```css
body {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
}

.logo-text {
  font-family: var(--font-brand);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1;
}

.hero-title {
  font-family: var(--font-brand);
  font-size: clamp(3.5rem, 8vw, 8rem);
  font-weight: 800;
  letter-spacing: -0.048em;
  line-height: 0.95;
}

.marketing-title {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.product-title {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.body-text {
  font-family: var(--font-sans);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
}

.cjk-text {
  font-family: var(--font-cjk);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.75;
  letter-spacing: 0.01em;
}

.mono-text {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.55;
}

.numeric-text {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
}
```

---

## 22. 最终执行方案

Virtual Nature Studio 字体体系定案：

```text
1. Funnel Display = 主品牌字体
2. Inter = 产品与正文主字体
3. Noto Sans SC = 中文与中英文混排稳定层
4. Geist Mono = 代码、Prompt、API、日志字体
```

最小实现版本：

```css
@theme {
  --font-brand:
    "Funnel Display", "Noto Sans SC", "PingFang SC", "Microsoft YaHei",
    ui-sans-serif, system-ui, sans-serif;
  --font-sans:
    "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", ui-sans-serif,
    system-ui, sans-serif;
  --font-cjk:
    "Noto Sans SC", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui,
    sans-serif;
  --font-mono:
    "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}
```

上线标准：

```text
品牌清晰：Funnel Display 在 Logo 与 Hero 中建立记忆点。
阅读稳定：Inter 承担 UI 和正文。
中文可靠：Noto Sans SC 与系统中文 fallback 处理中文和混排。
技术专业：Geist Mono 承担代码、Prompt、API 与日志。
性能可控：首屏不加载过量字体文件。
治理明确：所有字体调用必须来自 token，不允许硬编码。
```

---

## 23. 参考来源

- Funnel Display / Google Fonts: https://fonts.google.com/specimen/Funnel+Display
- Inter / Google Fonts: https://fonts.google.com/specimen/Inter
- Inter official site: https://rsms.me/inter/
- Noto Sans SC / Google Fonts: https://fonts.google.com/noto/specimen/Noto%2BSans%2BSC
- Noto CJK repository: https://github.com/notofonts/noto-cjk
- Geist / Vercel: https://vercel.com/font
- Geist Design System: https://vercel.com/geist/introduction
- Apple Fonts / San Francisco: https://developer.apple.com/fonts/
- Microsoft Fluent Typography: https://fluent2.microsoft.design/typography
- IBM Plex: https://www.ibm.com/plex/
- IBM Design Language Typeface: https://www.ibm.com/design/language/typography/typeface/
- OpenAI Brand Typography: https://openai.com/brand/
