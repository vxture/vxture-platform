/**
 * metadata.ts - 案例详情页元数据生成器
 * @package @vxture/website
 * @layer Presentation
 * @category Pages - Cases
 * @author AI-Generated
 * @date 2026-05-06
 */

import type { Metadata } from "next";
import { CASES_DATA } from "@/data/cases/cases.data";

interface CaseMetadataParams {
  params: {
    slug: string;
  };
}

export async function generateMetadata({
  params,
}: CaseMetadataParams): Promise<Metadata> {
  const { slug } = params;
  const caseItem = CASES_DATA.items.find((item) => item.slug === slug);

  if (!caseItem) {
    return {
      title: "Case Not Found",
      description: "The requested case study was not found.",
    };
  }

  // CaseItem 使用 i18n key 模式，文本字段由 next-intl 在运行时解析
  // 元数据使用 slug 作为标识，具体文本由消费方通过翻译文件提供
  return {
    title: caseItem.slug,
    description: `Case study: ${caseItem.slug}`,
    openGraph: {
      title: caseItem.slug,
      description: `Case study: ${caseItem.slug}`,
      images: [
        {
          url: caseItem.cover.url,
          width: 1200,
          height: 630,
          alt: caseItem.slug,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: caseItem.slug,
      description: `Case study: ${caseItem.slug}`,
      images: [caseItem.cover.url],
    },
  };
}
