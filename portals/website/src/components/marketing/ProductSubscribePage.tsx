"use client";

/**
 * ProductSubscribePage — /pricing 通用订阅页。
 * 从产品中心卡片「订阅」进入，?product= 选定产品（默认 arda）；
 * 页面结构参照 figma.com/pricing 简化为两个板块：
 *   1. 选择套餐与席位（计费周期切换 + 档位卡片）
 *   2. 对比所有功能（分组功能对比表）
 * 数据按产品 code 组织在 products.subscription.products 下，
 * 后续产品/套餐/解决方案开放订阅时只需补充对应 code 的数据。
 * 档位 CTA 深链 console /subscribe（携带 product/intent/target_tier）。
 */

import { Fragment, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button, Icon } from "@vxture/design-system";
import { Link } from "@/lib/i18n/navigation";
import { buildConsoleSubscribeUrl } from "@/lib/console-entry";

type Plan = {
  tier: string;
  name: string;
  monthly: string | null; // null = 联系销售（企业版）
  yearly: string | null;
  save?: string;
  seats: string;
  features: string[];
  highlight?: boolean;
};

type ComparisonRow = {
  label: string;
  /** 每档一列：true=✓，false=不含，字符串=具体额度 */
  values: (string | boolean)[];
};

type ComparisonGroup = { title: string; rows: ComparisonRow[] };

type SubscribableProduct = {
  name: string;
  contactSubject: string;
  plans: Plan[];
  comparison: { groups: ComparisonGroup[] };
};

type Cycle = "monthly" | "yearly";

const DEFAULT_PRODUCT = "arda";

/**
 * 档位卡片列数按产品实际发布的档位数动态取值，宽屏保持一行；
 * Tailwind 类名需编译期字面量，故用映射表而非模板拼接。
 */
const PLAN_GRID_COLS: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <Icon
        name="check"
        className="mx-auto h-4 w-4 text-vx-brand-500"
        aria-hidden
      />
    );
  }
  if (value === false) {
    return <span className="text-vx-gray-400 dark:text-vx-gray-600">—</span>;
  }
  return (
    <span className="text-vx-gray-700 dark:text-vx-gray-200">{value}</span>
  );
}

export default function ProductSubscribePage() {
  const t = useTranslations("products.subscription");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const productCode = searchParams.get("product") ?? DEFAULT_PRODUCT;
  const productsMap = t.raw("products") as Record<string, SubscribableProduct>;
  const product = productsMap[productCode] ?? null;
  const [cycle, setCycle] = useState<Cycle>("yearly");

  return (
    <div className="vx-page-surface">
      <section className="vx-section-odd">
        <div className="mx-auto max-w-7xl px-6 pt-24 lg:px-8 xl:max-w-screen-2xl">
          <p className="vx-website-hero-eyebrow text-sm font-semibold uppercase text-vx-brand-600 dark:text-vx-info-200">
            {t("eyebrow")}
          </p>
          <h1 className="font-brand mt-3 text-4xl font-bold leading-tight text-vx-gray-900 dark:text-vx-white md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-vx-gray-600 dark:text-vx-gray-300">
            {t("description")}
          </p>

          {!product ? (
            <div className="mt-12 rounded-lg border border-vx-gray-200 bg-vx-white p-8 dark:border-vx-gray-800 dark:bg-vx-gray-900">
              <p className="text-sm leading-6 text-vx-gray-600 dark:text-vx-gray-300">
                {t("unavailable")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <a
                    href={`mailto:sales@vxture.com?subject=${encodeURIComponent(
                      `${productCode} ${t("contact")}`,
                    )}`}
                  >
                    {t("contact")}
                  </a>
                </Button>
                <Button asChild>
                  <Link href="/products">{t("back")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ── 板块一：选择套餐与席位 ───────────────────────────────── */}
              <div className="mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-vx-brand-600 dark:text-vx-brand-300">
                    {product.name}
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-bold text-vx-gray-900 dark:text-vx-white md:text-3xl">
                    {t("pick.title")}
                  </h2>
                  <p className="mt-2 text-sm text-vx-gray-600 dark:text-vx-gray-300">
                    {t("pick.description")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(["monthly", "yearly"] as Cycle[]).map((c) => (
                    <Button
                      key={c}
                      variant={cycle === c ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCycle(c)}
                      className="h-10 px-4"
                    >
                      {t(`cycle.${c}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div
                className={`mt-8 grid gap-4 md:grid-cols-2 ${
                  PLAN_GRID_COLS[product.plans.length] ?? "xl:grid-cols-5"
                }`}
              >
                {product.plans.map((plan) => {
                  const price =
                    cycle === "monthly" ? plan.monthly : plan.yearly;
                  const isContact = price === null;
                  return (
                    <article
                      key={plan.tier}
                      className={`relative flex flex-col rounded-lg border p-5 shadow-sm transition ${
                        plan.highlight
                          ? "border-vx-brand-400 bg-vx-brand-50/40 dark:border-vx-brand-500/40 dark:bg-vx-brand-950/20"
                          : "border-vx-gray-200 bg-vx-white dark:border-vx-gray-800 dark:bg-vx-gray-900"
                      }`}
                    >
                      {plan.highlight ? (
                        <span className="absolute -top-3 right-4 rounded-full bg-vx-brand-600 px-2.5 py-0.5 text-xs font-semibold text-vx-white dark:bg-vx-brand-500">
                          {t("recommended")}
                        </span>
                      ) : null}
                      <h3 className="text-lg font-semibold text-vx-gray-900 dark:text-vx-white">
                        {plan.name}
                      </h3>
                      <div className="mt-3">
                        {isContact ? (
                          <p className="text-xl font-bold text-vx-gray-900 dark:text-vx-white">
                            {t("contact")}
                          </p>
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-vx-gray-900 dark:text-vx-white">
                              {price}
                            </p>
                            <p className="text-xs text-vx-gray-500 dark:text-vx-gray-400">
                              {t(`per.${cycle}`)}
                              {cycle === "yearly" && plan.save
                                ? ` · ${plan.save}`
                                : ""}
                            </p>
                          </>
                        )}
                      </div>
                      <p className="mt-3 flex items-center gap-2 border-t border-vx-gray-100 pt-3 text-sm font-medium text-vx-gray-700 dark:border-vx-gray-800 dark:text-vx-gray-200">
                        <Icon
                          name="users"
                          className="h-4 w-4 shrink-0 text-vx-brand-500"
                        />
                        {plan.seats}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex gap-2 text-sm text-vx-gray-600 dark:text-vx-gray-300"
                          >
                            <Icon
                              name="check"
                              className="mt-0.5 h-4 w-4 shrink-0 text-vx-brand-500"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-5">
                        {isContact ? (
                          <Button asChild variant="outline" className="w-full">
                            <a
                              href={`mailto:sales@vxture.com?subject=${encodeURIComponent(
                                product.contactSubject,
                              )}`}
                            >
                              {t("contact")}
                            </a>
                          </Button>
                        ) : (
                          <Button asChild className="w-full">
                            <a
                              href={buildConsoleSubscribeUrl(
                                locale,
                                productCode,
                                "subscribe",
                                plan.tier,
                              )}
                            >
                              {t("subscribe")}
                            </a>
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {product ? (
        <section className="vx-section-even">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 xl:max-w-screen-2xl">
            <h2 className="font-display text-2xl font-bold text-vx-gray-900 dark:text-vx-white md:text-3xl">
              {t("compare.title")}
            </h2>

            {/* ── 板块二：对比所有功能 ─────────────────────────────────── */}
            <div className="mt-8 overflow-x-auto rounded-lg border border-vx-gray-200 bg-vx-white dark:border-vx-gray-800 dark:bg-vx-gray-900">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-vx-gray-200 dark:border-vx-gray-800">
                    <th className="w-56 px-4 py-3 text-left font-semibold text-vx-gray-500 dark:text-vx-gray-400">
                      {t("compare.feature")}
                    </th>
                    {product.plans.map((plan) => (
                      <th
                        key={plan.tier}
                        className={`px-4 py-3 text-center font-semibold ${
                          plan.highlight
                            ? "text-vx-brand-600 dark:text-vx-brand-300"
                            : "text-vx-gray-900 dark:text-vx-white"
                        }`}
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {product.comparison.groups.map((group) => (
                    <Fragment key={group.title}>
                      <tr className="bg-vx-gray-50 dark:bg-vx-gray-800/50">
                        <td
                          colSpan={product.plans.length + 1}
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-vx-gray-500 dark:text-vx-gray-400"
                        >
                          {group.title}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr
                          key={row.label}
                          className="border-t border-vx-gray-100 dark:border-vx-gray-800"
                        >
                          <td className="px-4 py-3 text-vx-gray-700 dark:text-vx-gray-200">
                            {row.label}
                          </td>
                          {row.values.map((value, i) => (
                            <td
                              key={`${row.label}-${product.plans[i]?.tier ?? i}`}
                              className="px-4 py-3 text-center"
                            >
                              <ComparisonCell value={value} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
