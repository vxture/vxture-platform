"use client";

/* Metering — opera-atlas-design.md §10：事实计量（Request / Token / TTFT /
 * Raw Cost），聚合维度 Provider（Model / Endpoint / Tenant 维度排期）。 */

import {
  DataTable,
  FilterBar,
  MetricGrid,
  NativeSelect,
  Section,
  ViewHeader,
} from "@vxture/design-system";
import { meteringByProvider } from "@/mocks/atlas";

const summary = [
  { id: "req", label: "总请求", value: "4.85M", icon: "gauge" },
  { id: "in", label: "Input Token", value: "8.81B", icon: "arrow-down" },
  { id: "out", label: "Output Token", value: "3.21B", icon: "arrow-up" },
  {
    id: "cost",
    label: "Raw Cost",
    value: "$29,880",
    icon: "coins",
    description: "事实成本；销售价格归 Admin",
  },
] as const;

export default function MeteringPage() {
  return (
    <div className="flex flex-col gap-xl">
      <ViewHeader
        icon="gauge"
        title="Metering"
        description="所有请求必须被计量。Opera 只记录事实（Raw Cost），不做定价。"
      />

      <MetricGrid items={[...summary]} columns={4} />

      <Section
        title="按 Provider 聚合"
        icon="plugs-connected"
        level={2}
        action={
          <FilterBar className="p-none">
            <NativeSelect
              wrapperClassName="w-fit"
              defaultValue="30d"
              aria-label="时间窗口"
            >
              <option value="24h">近 24 小时</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
            </NativeSelect>
          </FilterBar>
        }
      >
        <DataTable
          columns={[
            { id: "dim", header: "Provider", cell: (r) => r.dimension },
            {
              id: "req",
              header: "请求数",
              align: "right",
              cell: (r) => r.requests,
            },
            {
              id: "in",
              header: "Input Token",
              align: "right",
              cell: (r) => r.inputTokens,
            },
            {
              id: "out",
              header: "Output Token",
              align: "right",
              cell: (r) => r.outputTokens,
            },
            {
              id: "ttft",
              header: "平均 TTFT",
              align: "right",
              cell: (r) => `${r.avgTtftMs}ms`,
            },
            {
              id: "cost",
              header: "Raw Cost",
              align: "right",
              cell: (r) => r.rawCost,
            },
          ]}
          rows={meteringByProvider}
          rowKey={(r) => r.id}
        />
      </Section>
    </div>
  );
}
