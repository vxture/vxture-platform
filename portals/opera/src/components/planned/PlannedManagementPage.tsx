"use client";

/* PlannedManagementPage — runos 管理面页面的共用外壳（8 个页面复用）。
 *
 * runos 现处于 M1（最小闭环：Registry 注册 + 语义发现 MCP + 网关身份验证 + 审计
 * 埋点），管理面 API（opera/admin 消费的 /capability/* 与 /commerce/*）是 M2
 * 范围，尚未实现——不是 opera 接入疏漏，是上游还没到。
 *
 * 只展示已冻结的路由契约本身（vxture-runos docs/30-design/100-overview.md
 * §6，真实、非推测），不编造任何行级数据：编字段/编行情看起来像真的，比明说
 * "没有"更容易误导，见 portals/console 的 Planned 组件同一原则。 */

import {
  Banner,
  Section,
  ViewHeader,
  ViewLayout,
  type IconName,
} from "@vxture/design-system";

interface PlannedManagementPageProps {
  icon: IconName;
  title: string;
  description: string;
  route: string;
  carries: string;
  plane?: "opera" | "commerce";
}

export function PlannedManagementPage({
  icon,
  title,
  description,
  route,
  carries,
  plane = "opera",
}: PlannedManagementPageProps) {
  return (
    <ViewLayout>
      <ViewHeader icon={icon} title={title} description={description} />

      <Banner
        tone="info"
        title="规划中：runos 管理面 API 尚未交付"
        description="runos 现处于 M1（最小闭环）：Registry 注册 + 语义发现（MCP，agent 侧 S2S 鉴权）+ 网关身份验证 + 审计埋点。opera/admin 消费的管理面 API 是 M2 范围，尚未实现——这里不接假数据，等 M2 落地后原样接入真实数据。"
      />

      <Section
        title="路由契约"
        icon="link"
        level={2}
        description="已冻结的路由骨架（vxture-runos docs/30-design/100-overview.md §6 / product_250 M-1），M2 落地后原样接入，不换形状。"
      >
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <span className="font-mono text-code-sm text-foreground">
              {route}
            </span>
            <span className="text-body-sm text-muted-foreground">
              {plane === "opera"
                ? "opera · operator-OBO（aud=runos, scope=mgmt:runos）"
                : "admin · operator-OBO（aud=runos, scope=mgmt:runos）"}
            </span>
          </div>
          <p className="text-body-sm text-muted-foreground">{carries}</p>
        </div>
      </Section>
    </ViewLayout>
  );
}
