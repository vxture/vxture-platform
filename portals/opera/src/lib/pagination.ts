"use client";

/* 列表页翻页的公共状态：五要件里表尾那一段（页码、每页条数、序号起点）。
 * 纯客户端切片——数据在 mock/内存里；接 BFF 分页时换掉 pageRows 的来源即可。 */

import { useMemo, useState } from "react";

export function useListPagination<T>(
  filtered: readonly T[],
  initialPageSize = 10,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return {
    page: safePage,
    pageCount,
    pageSize,
    pageRows,
    /** 序号列起点：跨页递进。 */
    indexStart: (safePage - 1) * pageSize + 1,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    /** 筛选条件变化时回第一页。 */
    resetPage: () => setPage(1),
  };
}
