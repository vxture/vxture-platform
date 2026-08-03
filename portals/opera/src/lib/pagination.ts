"use client";

/* 列表页翻页的公共状态：五要件里表尾那一段（页码、每页条数、序号起点）。
 * 纯客户端切片——数据在 mock/内存里；接 BFF 分页时换掉 pageRows 的来源即可。
 *
 * "auto" 档（默认）：按可视高度解析每页行数——探测 main 里的首个列表行
 * （表格行或 ListCard 行卡），用它的顶缘到视口底的距离除以实测行高，
 * 余量留给表尾。意图：不出现纵向滚动，能显示几行就显示几行，持续翻页
 * （owner 2026-08-03）。清单页一页只有一张列表，探测不需要 ref 接线。 */

import { useEffect, useMemo, useState } from "react";
import type { PageSizeChoice } from "@vxture/design-system";

/** 表尾（翻页条 + 间距）的预留高度；行高兜底值取常规密度的表格行。 */
const FOOTER_RESERVE_PX = 104;
const FALLBACK_ROW_PX = 56;
const MIN_AUTO_ROWS = 3;

function measureAutoRows(): number {
  const probe =
    document.querySelector("main tbody tr") ??
    document.querySelector("main [data-list-card]");
  if (!probe) return 10;
  const rect = probe.getBoundingClientRect();
  const rowHeight = rect.height || FALLBACK_ROW_PX;
  const available = window.innerHeight - rect.top - FOOTER_RESERVE_PX;
  return Math.max(MIN_AUTO_ROWS, Math.floor(available / rowHeight));
}

export function useListPagination<T>(
  filtered: readonly T[],
  initialPageSize: PageSizeChoice = "auto",
) {
  const [page, setPage] = useState(1);
  const [choice, setChoice] = useState<PageSizeChoice>(initialPageSize);
  const [autoSize, setAutoSize] = useState(10);

  useEffect(() => {
    if (choice !== "auto") return;
    const measure = () => setAutoSize(measureAutoRows());
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [choice]);

  const pageSize = choice === "auto" ? autoSize : choice;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return {
    page: safePage,
    pageCount,
    /** 选中的档（喂给 Pagination 的 pageSize——"auto" 档就是 "auto"）。 */
    pageSize: choice,
    pageRows,
    /** 序号列起点：跨页递进。 */
    indexStart: (safePage - 1) * pageSize + 1,
    onPageChange: setPage,
    onPageSizeChange: (size: PageSizeChoice) => {
      setChoice(size);
      setPage(1);
    },
    /** 筛选条件变化时回第一页。 */
    resetPage: () => setPage(1),
  };
}
