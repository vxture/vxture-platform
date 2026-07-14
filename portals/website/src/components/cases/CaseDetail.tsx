/**
 * CaseDetail.tsx - 案例详情页面
 *
 * 功能：展示单个案例的详细信息
 * 文本数据：来自 cases 命名空间（messages/{locale}/cases.json）
 * 结构数据：来自 CASES_DATA（仅含 id/slug/cover/cta/publishedAt）
 *
 * @package @vxture/website
 * @layer Presentation
 * @category Components - Cases
 * @author AI-Generated
 * @date 2026-03-17
 */
"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CASES_DATA } from "@/data/cases/cases.data";

interface CaseDetailProps {
  slug: string;
}

export default function CaseDetail({ slug }: CaseDetailProps) {
  const t = useTranslations("cases");
  const tItems = useTranslations("cases.items");

  const caseItem = CASES_DATA.items.find((item) => item.slug === slug);

  if (!caseItem) notFound();

  const title = tItems(`${caseItem.id}.title`);
  const subtitle = tItems(`${caseItem.id}.subtitle`);
  const description = tItems(`${caseItem.id}.description`);
  const coverAlt = tItems(`${caseItem.id}.cover.alt`);
  const tags = (tItems.raw(`${caseItem.id}.tags`) as string[]) ?? [];

  return (
    <section className="vx-section-odd min-h-screen">
      <div className="container mx-auto px-4 py-16">
        {/* 案例头部 */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-vx-brand-100 text-vx-brand-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="font-display text-4xl font-bold text-vx-gray-900 mb-4">
            {title}
          </h1>
          <p className="text-xl text-vx-gray-600 mb-6">{subtitle}</p>
          <div className="flex items-center gap-4 text-sm text-vx-gray-500">
            <span>{caseItem.publishedAt}</span>
          </div>
        </div>

        {/* 封面图 */}
        <div className="relative aspect-video mb-12 rounded-lg overflow-hidden shadow-lg">
          <Image
            src={caseItem.cover.url}
            alt={coverAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
            priority
          />
        </div>

        {/* 详情内容 */}
        <div className="space-y-12">
          {/* 项目概述 */}
          <div>
            <h2 className="font-display text-2xl font-semibold text-vx-gray-900 mb-4">
              {t(CASES_DATA.ui.overviewKey)}
            </h2>
            <p className="text-vx-gray-600 leading-relaxed">{description}</p>
          </div>

          {/* 核心亮点 */}
          {tags.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-vx-gray-900 mb-6">
                {t(CASES_DATA.ui.highlightsKey)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="bg-vx-white rounded-lg shadow-md p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-vx-brand-100 text-vx-brand-600 rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-vx-gray-900">
                          {tag}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
