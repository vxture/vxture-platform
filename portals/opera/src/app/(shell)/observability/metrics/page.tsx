"use client";

/* Metrics — opera-top-level-design.md §7：Gateway / Provider / Endpoint
 * 三层服务指标。图表组件按 DS 判据归 domain-ui 排期，本期以指标卡呈现。 */

import { Banner, MetricGrid, Section, ViewHeader } from "@vxture/design-system";

const gateway = [
  {
    id: "qps",
    label: "Gateway QPS",
    value: "142",
    icon: "lightning",
    trend: "+11%",
    trendTone: "success",
  },
  { id: "tps", label: "Token TPS", value: "38.4K", icon: "stack" },
  {
    id: "lat",
    label: "P95 延迟",
    value: "412ms",
    icon: "timer",
    trend: "+38ms",
    trendTone: "warning",
  },
  {
    id: "err",
    label: "错误率",
    value: "0.42%",
    icon: "warning",
    trend: "+0.1pp",
    trendTone: "warning",
  },
] as const;

const providerMetrics = [
  { id: "ok", label: "Provider 成功率", value: "99.2%", icon: "success" },
  {
    id: "fo",
    label: "Failover 次数 / 24h",
    value: "17",
    icon: "arrows-down-up",
  },
  {
    id: "deg",
    label: "降级 Provider",
    value: "1",
    icon: "trend-down",
    tone: "warning",
  },
  { id: "probe", label: "健康探测通过", value: "23/24", icon: "waveform" },
] as const;

export default function MetricsPage() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        icon="chart-line-up"
        title="Metrics"
        description="所有请求必须可观测：Gateway、Provider、Endpoint 三层指标；链路追踪基于 OpenTelemetry。"
      />

      <Banner
        tone="info"
        title="趋势图排期"
        description="时序趋势图依赖图表组件（DS 判据归 domain-ui），随功能期接入；本期先给指标事实。"
      />

      <Section title="Gateway" icon="globe" level={2}>
        <MetricGrid items={[...gateway]} columns={4} />
      </Section>

      <Section title="Provider" icon="plugs-connected" level={2}>
        <MetricGrid items={[...providerMetrics]} columns={4} />
      </Section>
    </div>
  );
}
