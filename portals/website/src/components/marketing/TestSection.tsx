/**
 * TestSection.tsx - 关于我们页面的分屏滚动演示
 *
 * 功能：简单的分屏滚动组件，展示关于我们页面的内容
 *
 * @author vxture team
 * @created 2024-06-01
 * @lastModified 2026-03-04
 * @version 1.0.0
 * @copyright Copyright (c) 2024-2026 vxture
 *
 * @layer Presentation
 * @category Components - About
 */
"use client";

interface SectionConfig {
  id: string;
  title: string;
  tone?: "page" | "odd" | "even";
}

interface TestSectionProps {
  sections: SectionConfig[];
}

export default function TestSection({ sections }: TestSectionProps) {
  return (
    <div className="min-h-screen">
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={`relative snap-section min-h-screen flex items-center justify-center ${
            section.tone === "page"
              ? "vx-page-surface"
              : section.tone === "even"
                ? "vx-section-even"
                : "vx-section-odd"
          }`}
        >
          <div className="text-center">
            <h2 className="font-display text-4xl font-bold text-vx-gray-800 mb-4">
              {section.title}
            </h2>
            <p className="text-lg text-vx-gray-600">
              欢迎来到关于我们页面！这里是 {section.title} 的内容。
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
