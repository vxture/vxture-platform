/**
 * 内容 API
 * @package @vxture/website
 * @layer Presentation
 * @category API
 */

import { apiClient } from "./client";

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageContent {
  hero: ContentItem;
  features: ContentItem;
  solutions: ContentItem;
  cases: ContentItem;
  cta: ContentItem;
}

export async function getContent(
  key: string,
  locale: string,
): Promise<ContentItem> {
  const response = await apiClient.get("/content", {
    params: { key, locale },
  });
  return response.data;
}

export async function getPageContent(
  page: string,
  locale: string,
): Promise<PageContent> {
  const response = await apiClient.get(`/content/page/${page}`, {
    params: { locale },
  });
  return response.data;
}

export async function updateContent(
  data: Partial<ContentItem>,
): Promise<ContentItem> {
  const response = await apiClient.put("/content", data);
  return response.data;
}
