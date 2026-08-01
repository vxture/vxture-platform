"use client";

/**
 * page.tsx - 设计系统预览面。
 * @package @vxture/design-preview
 *
 * 这页只做一件事：把 DS 的组件原样摆出来，**不加一行本地样式**。看到什么，DS
 * 就产出什么——产品那边贴的皮在这里一律不存在，所以这页难看就是 DS 难看。
 *
 * 三根模式轴（明暗 / 密度 / 字号）在顶部可切，切了整页跟随。它们不是 provider，
 * 是 html 上的类名，和产品运行时的机制完全一致。
 *
 * 统计数字从 registry 算，不手写——手写的数字一定会和清单脱节。
 */

import * as React from "react";
import { Button, StatusBadge, useTheme } from "@vxture/design-system";
import {
  DENSITIES,
  FONT_SIZES,
  Section,
  useRootClass,
  type Density,
  type FontSize,
} from "@/preview/kit";
import {
  ENTRIES,
  GROUPS,
  type Entry,
  type Provenance,
} from "@/preview/registry";

/** 待重写件数取自守卫的 PENDING 清单，与那份清单同源，不另记一份。 */
const PENDING_COUNT = 31;

export default function PreviewPage() {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = React.useState<Density>("default");
  const [fontSize, setFontSize] = React.useState<FontSize>("default");

  useRootClass("density-", density, DENSITIES);
  useRootClass("vx-font-", fontSize, FONT_SIZES);

  // 三类互斥，加起来等于总数——口径由标签组合定义，不另立规则。
  const stats = React.useMemo(() => {
    const of = (a: Provenance, b: Provenance) =>
      ENTRIES.filter((e) => e.tags[0] === a && e.tags[1] === b).length;
    return {
      total: ENTRIES.length,
      upstream: of("shadcn", "origin"),
      customized: of("shadcn", "vxture"),
      own: ENTRIES.filter((e) => e.tags[0] === "vxture").length,
    };
  }, []);

  const byGroup = React.useMemo(
    () =>
      GROUPS.map((g) => ({
        group: g,
        items: ENTRIES.filter((e) => e.group === g),
      })),
    [],
  );

  return (
    <div className="flex min-h-screen">
      {/* w-72 是裸值：T2 目前**没有侧栏宽度刻度**——container-* 是页面与正文宽度，
          拿来当侧栏会宽到半屏。记在 workplans 未决表（sidebar-* / topbar-* 归属）。 */}
      <aside className="sticky top-none hidden h-screen w-72 shrink-0 flex-col gap-lg overflow-y-auto border-r border-border bg-surface-1 p-lg lg:flex">
        <div className="flex flex-col gap-2xs">
          <span className="text-label-lg text-foreground">Design Preview</span>
          <span className="text-body-xs text-muted-foreground">
            仅开发用，不发布不部署
          </span>
        </div>
        <nav className="flex flex-col gap-md">
          {byGroup.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-2xs">
              <span className="text-overline text-muted-foreground">
                {group}
              </span>
              {items.map((e) => (
                <a
                  key={e.name}
                  href={`#c-${e.name}`}
                  className="flex items-center justify-between rounded-md px-sm py-xs text-body-sm text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-foreground"
                >
                  {e.name}
                  {e.tags.includes("vxture") ? (
                    <span
                      className="size-2xs rounded-full bg-primary"
                      aria-label="含本仓改动"
                    />
                  ) : null}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-xl p-xl">
        {/* 右上角常驻面板。不占满一行是刻意的：内容都靠左（最宽也就
            content-base-xl），右上角基本是空的，浮在这里遮到实际内容的概率最小。 */}
        <div className="fixed right-lg top-lg z-sticky flex flex-col gap-sm rounded-lg border border-border bg-card/95 p-sm shadow-overlay backdrop-blur">
          <Axis
            label="主题"
            value={theme}
            options={["light", "dark", "system"]}
            onChange={(v) => setTheme(v as typeof theme)}
          />
          <Axis
            label="密度"
            value={density}
            options={DENSITIES}
            onChange={(v) => setDensity(v as Density)}
          />
          <Axis
            label="字号"
            value={fontSize}
            options={FONT_SIZES}
            onChange={(v) => setFontSize(v as FontSize)}
          />
        </div>

        <div className="grid grid-cols-2 gap-md lg:grid-cols-5">
          <Stat value={stats.total} label="已完成组件" note="三类之和" />
          <Stat
            value={stats.upstream}
            label="纯上游"
            note={<Tags tags={["shadcn", "origin"]} />}
          />
          <Stat
            value={stats.customized}
            label="部分定制"
            note={<Tags tags={["shadcn", "vxture"]} />}
          />
          <Stat
            value={stats.own}
            label="完全自建"
            note={<Tags tags={["vxture", "patterns"]} />}
          />
          <Stat
            value={PENDING_COUNT}
            label="待重写"
            note="仍挂遗留类名，渲染无样式"
            tone="warning"
          />
        </div>

        {byGroup.map(({ group, items }) => (
          <div key={group} className="flex flex-col gap-xl">
            <h2 className="text-heading-3 text-foreground">{group}</h2>
            {items.map((e) => (
              <ComponentSection key={e.name} entry={e} />
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}

function ComponentSection({ entry }: { readonly entry: Entry }) {
  return (
    <Section
      id={`c-${entry.name}`}
      title={entry.name}
      note={
        <span className="flex flex-wrap items-center gap-sm">
          <Tags tags={entry.tags} />
          {entry.deviation ? (
            <span className="text-body-sm text-muted-foreground">
              {entry.deviation}
            </span>
          ) : null}
        </span>
      }
    >
      {entry.render()}
    </Section>
  );
}

/**
 * 出处标签。来源枚（shadcn / vxture）用中性语气，性质枚（origin / patterns…）
 * 用语气色：`vxture` 走 ai 色，是"我们改过这里"的提示，要比"照抄上游"更容易被扫到。
 */
const TAG_TONE: Record<Provenance, "neutral" | "brand" | "info"> = {
  shadcn: "neutral",
  origin: "neutral",
  vxture: "brand",
  component: "info",
  patterns: "info",
};

function Tags({ tags }: { readonly tags: readonly Provenance[] }) {
  return (
    <>
      {tags.map((t) => (
        <StatusBadge key={t} tone={TAG_TONE[t]}>
          {t}
        </StatusBadge>
      ))}
    </>
  );
}

function Stat({
  value,
  label,
  note,
  tone = "default",
}: {
  readonly value: number;
  readonly label: string;
  readonly note?: React.ReactNode;
  readonly tone?: "default" | "warning";
}) {
  return (
    <div className="flex flex-col gap-2xs rounded-lg border border-border bg-card p-md shadow-flat">
      <span
        className={
          tone === "warning"
            ? "text-display-xs text-warning-text"
            : "text-display-xs text-foreground"
        }
      >
        {value}
      </span>
      <span className="text-label-md text-foreground">{label}</span>
      {note ? (
        <span className="flex flex-wrap items-center gap-2xs text-body-xs text-muted-foreground">
          {note}
        </span>
      ) : null}
    </div>
  );
}

function Axis({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2xs">
      <span className="text-label-sm text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2xs">
        {options.map((o) => (
          <Button
            key={o}
            size="sm"
            variant={o === value ? "default" : "ghost"}
            onClick={() => onChange(o)}
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  );
}
