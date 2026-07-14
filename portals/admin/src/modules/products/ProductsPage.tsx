"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon,
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  Input,
  NativeSelect,
  Pagination,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { fetchProductCapabilities } from "@/api/admin-bff";
import type {
  ProductCapabilityIntegrationStatus,
  ProductCapabilityRecord,
  ProductCapabilitySource,
  ProductCapabilityStatus,
  ProductCapabilityType,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";
import { formatNumber, joinClasses } from "@/modules/tenants/tenant-utils";

type ViewMode = "list" | "cards";
type TypeFilter = "all" | ProductCapabilityType;
type SourceFilter = "all" | ProductCapabilitySource;
type StatusFilter = "all" | ProductCapabilityStatus;
type AccessFilter = "all" | ProductCapabilityIntegrationStatus;

function productTypeLabel(type: ProductCapabilityType) {
  if (type === "platform") return "平台";
  if (type === "agent") return "智能体";
  if (type === "model") return "模型";
  if (type === "data") return "数据";
  return "服务";
}

function productSourceLabel(source: ProductCapabilitySource) {
  return source === "self" ? "自建" : "三方接入";
}

function productStatusLabel(status: ProductCapabilityStatus) {
  if (status === "active") return "已上线";
  if (status === "draft") return "草稿";
  return "已归档";
}

function productAccessLabel(state: ProductCapabilityIntegrationStatus) {
  if (state === "connected") return "已接入";
  if (state === "testing") return "联调中";
  if (state === "config_required") return "待配置";
  return "无需接入";
}

function productRegionLabel(region: ProductCapabilityRecord["region"]) {
  if (region === "domestic") return "国内";
  if (region === "international") return "国际";
  return "全局";
}

function productTypeIcon(type: ProductCapabilityType): IconName {
  if (type === "platform") return "database";
  if (type === "agent") return "agent";
  if (type === "model") return "cloud";
  if (type === "data") return "table";
  return "server";
}

function productSearchText(product: ProductCapabilityRecord) {
  return [
    product.productCode,
    product.productName,
    product.description,
    product.productType,
    product.source,
    product.status,
    product.region,
    product.ownerTeam,
    product.meteringUnit,
    product.billingMode,
    productAccessLabel(product.integration.status),
    ...product.tags,
    ...product.relatedSolutions.map(
      (solution) =>
        `${solution.solutionCode} ${solution.solutionName} ${solution.role}`,
    ),
    ...product.releases.map(
      (release) =>
        `${release.releaseCode} ${release.releaseName} ${release.versionLabels.join(" ")}`,
    ),
  ]
    .join(" ")
    .toLowerCase();
}

function ProductSummaryItem({
  icon,
  label,
  value,
  tags,
  tone = "blue",
}: {
  icon: IconName;
  label: string;
  value: string;
  tags?: string[];
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <article className={`vx-tenant-summary__item vx-tenant-tone--${tone}`}>
      <Icon name={icon} size="lg" fallback="placeholder" />
      <div>
        <span>{label}</span>
        <p>
          <strong>{value}</strong>
          {tags?.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </p>
      </div>
    </article>
  );
}

function ProductActionsMenu({
  product,
  onViewDetails,
}: {
  product: ProductCapabilityRecord;
  onViewDetails: () => void;
}) {
  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${product.productName} 操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "details",
            label: "查看详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            onSelect: onViewDetails,
          },
          {
            id: "edit",
            label: "编辑能力",
            icon: <Icon name="edit" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "integration",
            label: "接入配置",
            icon: <Icon name="shield-check" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "toggle-status",
            label: product.status === "active" ? "下线能力" : "上线能力",
            icon: (
              <Icon
                name={product.status === "active" ? "x" : "check"}
                size="xs"
                fallback="placeholder"
              />
            ),
            disabled: true,
          },
        ]}
      />
    </div>
  );
}

function ProductListRows({
  products,
  startIndex,
  selectedProductCodes,
  isPageSelected,
  onOpenDetails,
  onToggleProduct,
  onTogglePage,
}: {
  products: ProductCapabilityRecord[];
  startIndex: number;
  selectedProductCodes: Set<string>;
  isPageSelected: boolean;
  onOpenDetails: (productCode: string) => void;
  onToggleProduct: (productCode: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}) {
  const selectedOnPage = products.filter((product) =>
    selectedProductCodes.has(product.productCode),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < products.length;

  return (
    <div
      className="vx-tenant-directory-list vx-product-directory-list"
      role="region"
      aria-label="产品能力清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={
              isPageSelected
                ? true
                : isPagePartiallySelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => onTogglePage(value === true)}
            aria-label="选择当前页产品能力"
          />
        </span>
        <span>序号</span>
        <span>产品能力</span>
        <span>类型</span>
        <span>状态</span>
        <span>方案</span>
        <span>接入</span>
        <span>计量</span>
        <span>操作</span>
      </div>
      {products.map((product, index) => (
        <div
          key={product.productCode}
          className={joinClasses(
            "vx-tenant-directory-row",
            "vx-product-operation-row",
            `vx-product-row--${product.status}`,
            selectedProductCodes.has(product.productCode)
              ? "vx-product-operation-row--selected"
              : "",
          )}
          onClick={(event) => {
            if (
              event.target instanceof HTMLElement &&
              event.target.closest(
                'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
              )
            )
              return;
            onToggleProduct(
              product.productCode,
              !selectedProductCodes.has(product.productCode),
            );
          }}
        >
          <span className="vx-product-operation-row__select">
            <Checkbox
              className="vx-model-select-checkbox"
              checked={selectedProductCodes.has(product.productCode)}
              onClick={(event) => event.stopPropagation()}
              onCheckedChange={(value) =>
                onToggleProduct(product.productCode, value === true)
              }
              aria-label={`选择 ${product.productName}`}
            />
          </span>
          <span className="vx-tenant-directory-row__index">
            {formatNumber(startIndex + index + 1)}
          </span>
          <span className="vx-tenant-directory-row__tenant vx-product-row__identity">
            <Icon
              name={productTypeIcon(product.productType)}
              size="sm"
              fallback="placeholder"
            />
            <span>
              <span className="vx-tenant-directory-row__title-line">
                <Button
                  variant="link"
                  className="vx-model-name-button"
                  onClick={() => onOpenDetails(product.productCode)}
                >
                  {product.productName}
                </Button>
              </span>
              <small>
                {product.productCode} · {productRegionLabel(product.region)}
              </small>
            </span>
          </span>
          <span className="vx-product-row__type">
            <span className="vx-tenant-directory-row__tag-line">
              <Badge
                className={`vx-tenant-pill vx-product-pill--${product.productType}`}
              >
                {productTypeLabel(product.productType)}
              </Badge>
              <Badge
                className={`vx-tenant-pill vx-product-pill--${product.source}`}
              >
                {productSourceLabel(product.source)}
              </Badge>
            </span>
          </span>
          <span className="vx-product-row__status">
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.status}`}
            >
              {productStatusLabel(product.status)}
            </Badge>
            <small>
              {product.visibility === "public" ? "公开" : "内部"} |{" "}
              {product.healthStatus === "normal" ? "健康" : "关注"}
            </small>
          </span>
          <span className="vx-product-row__supply">
            <strong>{formatNumber(product.solutionCount)} 方案</strong>
            <small>
              {formatNumber(product.planCount)} 套餐 |{" "}
              {formatNumber(product.releaseCount)} 发布
            </small>
          </span>
          <span className="vx-product-row__access">
            <Badge
              className={`vx-tenant-pill vx-product-pill--access-${product.integration.status}`}
            >
              {productAccessLabel(product.integration.status)}
            </Badge>
            <small>{formatNumber(product.modelPolicyCount)} 模型授权</small>
          </span>
          <span className="vx-product-row__updated">
            <strong>{product.meteringUnit}</strong>
            <small>{product.billingMode}</small>
          </span>
          <ProductActionsMenu
            product={product}
            onViewDetails={() => onOpenDetails(product.productCode)}
          />
        </div>
      ))}
    </div>
  );
}

function ProductCards({
  products,
  onOpenDetails,
}: {
  products: ProductCapabilityRecord[];
  onOpenDetails: (productCode: string) => void;
}) {
  return (
    <div
      className="vx-tenant-directory-cards vx-product-cards"
      aria-label="产品能力卡片"
    >
      {products.map((product) => (
        <article
          key={product.productCode}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-product-card--${product.status}`,
          )}
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetails(product.productCode)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onOpenDetails(product.productCode);
          }}
        >
          <header>
            <Icon
              name={productTypeIcon(product.productType)}
              size="lg"
              fallback="placeholder"
            />
            <div>
              <strong>{product.productName}</strong>
              <span>
                {product.productCode} · {productRegionLabel(product.region)}
              </span>
            </div>
            <ProductActionsMenu
              product={product}
              onViewDetails={() => onOpenDetails(product.productCode)}
            />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.productType}`}
            >
              {productTypeLabel(product.productType)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.source}`}
            >
              {productSourceLabel(product.source)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.status}`}
            >
              {productStatusLabel(product.status)}
            </Badge>
          </div>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatNumber(product.solutionCount)}</b>
              <small>方案</small>
            </span>
            <span>
              <b>{formatNumber(product.planCount)}</b>
              <small>套餐</small>
            </span>
            <span>
              <b>{formatNumber(product.modelPolicyCount)}</b>
              <small>策略</small>
            </span>
          </div>
          <footer>
            <span>{product.meteringUnit}</span>
            <strong>{productAccessLabel(product.integration.status)}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

function ProductPagination({
  currentPage,
  pageCount,
  total,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  total: number;
  pageSize: PageSize;
  onPageSizeChange: (value: PageSize) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <footer className="vx-tenant-pagination">
      <span className="vx-tenant-pagination__total">
        共 {formatNumber(total)} 条记录
      </span>
      <div className="vx-tenant-pagination__actions">
        <AdminPageSizePicker value={pageSize} onChange={onPageSizeChange} />
        <Pagination
          className="vx-tenant-pagination__pager"
          page={currentPage}
          pageCount={pageCount}
          onPageChange={onPageChange}
        />
      </div>
    </footer>
  );
}

export function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductCapabilityRecord[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProductCodes, setSelectedProductCodes] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchProductCapabilities()
      .then((records) => {
        if (!active) return;
        setProducts(records);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      if (typeFilter !== "all" && product.productType !== typeFilter)
        return false;
      if (sourceFilter !== "all" && product.source !== sourceFilter)
        return false;
      if (statusFilter !== "all" && product.status !== statusFilter)
        return false;
      if (accessFilter !== "all" && product.integration.status !== accessFilter)
        return false;
      if (
        normalizedQuery &&
        !productSearchText(product).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [accessFilter, products, query, sourceFilter, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const visibleProducts = filteredProducts.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const visibleProductCodes = visibleProducts.map(
    (product) => product.productCode,
  );
  const selectedVisibleProductCount = visibleProductCodes.filter(
    (productCode) => selectedProductCodes.has(productCode),
  ).length;
  const isProductPageSelected =
    visibleProductCodes.length > 0 &&
    selectedVisibleProductCount === visibleProductCodes.length;
  const activeProducts = products.filter(
    (product) => product.status === "active",
  ).length;
  const agentProducts = products.filter(
    (product) => product.productType === "agent",
  ).length;
  const platformProducts = products.filter(
    (product) => product.productType === "platform",
  ).length;
  const partnerProducts = products.filter(
    (product) => product.source === "partner",
  ).length;
  const solutionCount = new Set(
    products.flatMap((product) =>
      product.relatedSolutions.map((solution) => solution.solutionCode),
    ),
  ).size;
  const configRequiredProducts = products.filter(
    (product) =>
      product.integration.status === "config_required" ||
      product.integration.status === "testing",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    accessFilter,
    pageSize,
    query,
    sourceFilter,
    statusFilter,
    typeFilter,
    viewMode,
  ]);

  function handleReset() {
    setQuery("");
    setTypeFilter("all");
    setSourceFilter("all");
    setStatusFilter("all");
    setAccessFilter("all");
  }

  function handleOpenDetails(productCode: string) {
    router.push(`/products/${encodeURIComponent(productCode)}`);
  }

  function toggleProductSelection(productCode: string, checked: boolean) {
    setSelectedProductCodes((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(productCode);
      } else {
        next.delete(productCode);
      }
      return next;
    });
  }

  function toggleProductPageSelection(checked: boolean) {
    setSelectedProductCodes((current) => {
      const next = new Set(current);
      for (const productCode of visibleProductCodes) {
        if (checked) {
          next.add(productCode);
        } else {
          next.delete(productCode);
        }
      }
      return next;
    });
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-product-management-page">
      <PageHeader
        icon="database"
        title="产品能力"
        description="统一管理可组合、可授权、可计量的基础产品能力，作为解决方案、服务套餐和模型授权的供给目录。"
      />

      <section className="vx-tenant-summary" aria-label="产品能力管理统计">
        <ProductSummaryItem
          icon="database"
          label="能力总数"
          value={formatNumber(products.length)}
          tags={[`上线 ${formatNumber(activeProducts)}`]}
        />
        <ProductSummaryItem
          icon="agent"
          label="能力类型"
          value={formatNumber(agentProducts + platformProducts)}
          tags={[
            `智能体 ${formatNumber(agentProducts)}`,
            `平台 ${formatNumber(platformProducts)}`,
          ]}
          tone="green"
        />
        <ProductSummaryItem
          icon="cloud"
          label="三方接入"
          value={formatNumber(partnerProducts)}
          tags={["合作方"]}
          tone={partnerProducts ? "amber" : "green"}
        />
        <ProductSummaryItem
          icon="workflow"
          label="方案复用"
          value={formatNumber(solutionCount)}
          tags={[`待配置 ${formatNumber(configRequiredProducts)}`]}
          tone={configRequiredProducts ? "amber" : "blue"}
        />
      </section>

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="产品能力筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="产品能力展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredProducts.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索能力、code、方案、计量"
            className="vx-tenant-search vx-product-search"
            aria-label="搜索产品能力"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
              aria-label="能力类型"
            >
              <option value="all">全部类型</option>
              <option value="platform">平台</option>
              <option value="agent">智能体</option>
              <option value="model">模型</option>
              <option value="data">数据</option>
              <option value="service">服务</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value as SourceFilter)
              }
              aria-label="产品来源"
            >
              <option value="all">全部来源</option>
              <option value="self">自建</option>
              <option value="partner">三方接入</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="产品状态"
            >
              <option value="all">全部状态</option>
              <option value="active">已上线</option>
              <option value="draft">草稿</option>
              <option value="archived">已归档</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={accessFilter}
              onChange={(event) =>
                setAccessFilter(event.target.value as AccessFilter)
              }
              aria-label="接入状态"
            >
              <option value="all">全部接入</option>
              <option value="connected">已接入</option>
              <option value="testing">联调中</option>
              <option value="config_required">待配置</option>
              <option value="not_required">无需接入</option>
            </NativeSelect>
          </div>
          <ActionButton variant="outline" icon="plus" disabled>
            新建能力
          </ActionButton>
        </section>

        <section className="vx-tenant-directory" aria-label="产品能力清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visibleProducts.length ? (
            viewMode === "list" ? (
              <ProductListRows
                products={visibleProducts}
                startIndex={(activePage - 1) * pageSize}
                selectedProductCodes={selectedProductCodes}
                isPageSelected={isProductPageSelected}
                onOpenDetails={handleOpenDetails}
                onToggleProduct={toggleProductSelection}
                onTogglePage={toggleProductPageSelection}
              />
            ) : (
              <ProductCards
                products={visibleProducts}
                onOpenDetails={handleOpenDetails}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={loading ? "正在加载产品能力" : "没有匹配的产品能力"}
                description={
                  loading
                    ? "正在读取产品能力供给目录。"
                    : "清空筛选条件后可查看全部产品能力。"
                }
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={handleReset}
                  >
                    清空筛选
                  </ActionButton>
                }
              />
            </section>
          )}

          <ProductPagination
            currentPage={activePage}
            pageCount={pageCount}
            total={filteredProducts.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>
    </div>
  );
}
