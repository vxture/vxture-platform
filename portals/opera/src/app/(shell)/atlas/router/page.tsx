"use client";

/* Router — opera-atlas-design.md §7：Atlas 1.0 只做 Primary / Failover；
 * Weight / Canary 是 2.0 范围，卡片上以禁用态占位说明。 */

import {
  Badge,
  Banner,
  Button,
  Card,
  CardContent,
  Icon,
  Kbd,
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

      <Section title="Endpoint 路由表" icon="plug" level={2}>
        <div className="grid gap-md md:grid-cols-2">
          {endpoints.map((e) => (
            <Card key={e.id} surface="base">
              <CardContent className="flex flex-col gap-sm">
                <div className="flex items-center justify-between gap-sm">
                  <Kbd>{e.code}</Kbd>
                  <StatusBadge tone={e.enabled ? "success" : "neutral"} dot>
                    {e.enabled ? "生效中" : "已停用"}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-sm text-body-md">
                  <Badge>{"Primary"}</Badge>
                  <span className="text-code-sm text-foreground">
                    {e.primaryModel}
                  </span>
                </div>
                {e.fallbackModel ? (
                  <div className="flex items-center gap-sm text-body-md">
                    <Badge variant="secondary">Fallback</Badge>
                    <span className="text-code-sm text-foreground">
                      {e.fallbackModel}
                    </span>
                    <Icon
                      name="arrow-bend-up-left"
                      size="xs"
                      className="text-muted-foreground"
                    />
                    <span className="text-body-sm text-muted-foreground">
                      超时 / 5xx 触发
                    </span>
                  </div>
                ) : (
                  <p className="text-body-sm text-muted-foreground">
                    未配置 fallback——单模型直路由
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}
