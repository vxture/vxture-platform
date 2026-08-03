"use client";

/* Router — opera-atlas-design.md §7：Atlas 1.0 只做 Primary / Failover；
 * Weight / Canary 是 2.0 范围，卡片上以禁用态占位说明。 */

import {
  Badge,
  Banner,
  Button,
  ListCard,
  ListCardGrid,
  Section,
  StatusBadge,
  ViewHeader,
} from "@vxture/design-system";
import { endpoints } from "@/mocks/atlas";

export default function RouterPage() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        icon="tree-structure"
        title="Router"
        description="模型选择由 Router 完成：业务只依赖 Endpoint，切换模型不改业务代码。当前支持 Single / Failover 两种模式。"
        action={<Button variant="outline">路由变更记录</Button>}
      />

      <Banner
        tone="info"
        title="Atlas 1.0 路由范围"
        description="Weight 与 Canary 路由在 Atlas 2.0 排期；本期变更仅 Primary / Fallback，所有变更进入 Audit。"
      />

      <Section
        title="Endpoint 路由表"
        icon="plug"
        level={2}
        description="每个入口的 Primary / Fallback 指派；路由细节到 Endpoint 页调整。"
      >
        <ListCardGrid>
          {endpoints.map((e) => (
            <ListCard
              key={e.id}
              icon="plug"
              title={<span className="font-mono">{e.code}</span>}
              description={e.category}
              status={
                <StatusBadge tone={e.enabled ? "success" : "neutral"} dot>
                  {e.enabled ? "生效中" : "已停用"}
                </StatusBadge>
              }
              meta={
                e.fallbackModel ? (
                  <>
                    <Badge>Primary</Badge>
                    <span className="text-code-sm text-foreground">
                      {e.primaryModel}
                    </span>
                    <Badge variant="secondary">Fallback</Badge>
                    <span className="text-code-sm text-foreground">
                      {e.fallbackModel}
                    </span>
                    <span>超时 / 5xx 触发</span>
                  </>
                ) : (
                  <>
                    <Badge>Primary</Badge>
                    <span className="text-code-sm text-foreground">
                      {e.primaryModel}
                    </span>
                    <span>未配置 fallback——单模型直路由</span>
                  </>
                )
              }
            />
          ))}
        </ListCardGrid>
      </Section>
    </div>
  );
}
