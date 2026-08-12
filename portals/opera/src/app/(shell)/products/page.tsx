"use client";

/* 产品目录 — 产品发布管理第一阶段：product.products 的注册与生命周期管理。
 *
 * 2026-08-12 新建：此前全仓（admin/opera 两侧）都没有任何地方能新建或编辑一行
 * 产品记录，admin-bff 的 products.router.ts 只读 + 发布 plan-version，是纯商业
 * 展示层。这里补的是基础设施登记本身——opera-bff 直连 product.products（没有
 * 独立微服务可代理），admin 现有的产品展示/订阅套餐发布原样不动，两侧零交叉
 * 引用。
 *
 * origin/origin_provider 是这次一并加的来源轴：self=平台自建、
 * third_party=第三方接入、other。新产品默认落 draft 状态，上线前操作员手动
 * 切到 active。 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ActionMenu,
  Badge,
  Banner,
  Button,
  Checkbox,
  DataTable,
  DialogForm,
  Drawer,
  EmptyState,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FilterBar,
  Icon,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  ListPageTemplate,
  NativeSelect,
  Pagination,
  Section,
  StatusBadge,
  Switch,
  TableTitleCell,
  Textarea,
  ViewHeader,
  useListPagination,
  useToast,
  type StatusBadgeTone,
} from "@vxture/design-system";
import { useOperatorSession } from "@/features/session/SessionProvider";
import { buildAdminAtlasGrantsUrl } from "@/lib/admin-entry";
import { api, OperaApiError } from "@/lib/api";

const MANAGE = "platform:product.manage";

type ReleaseChannel = "stable" | "beta" | "canary";
type ClientStatus = "active" | "disabled";

interface OidcClientRecord {
  id: string;
  clientId: string;
  productId: string | null;
  productCode: string | null;
  releaseChannel: ReleaseChannel;
  name: string | null;
  displayName: string | null;
  redirectUris: string[];
  allowedScopes: string[];
  pkceRequired: boolean;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

interface ClientDraft {
  clientId: string;
  releaseChannel: ReleaseChannel;
  name: string;
  displayName: string;
  redirectUris: string;
  allowedScopes: string;
  pkceRequired: boolean;
}

const DEFAULT_CLIENT_DRAFT: ClientDraft = {
  clientId: "",
  releaseChannel: "stable",
  name: "",
  displayName: "",
  redirectUris: "",
  allowedScopes: "openid, profile, email, phone",
  pkceRequired: true,
};

const CLIENT_STATUS_TONE: Record<ClientStatus, StatusBadgeTone> = {
  active: "success",
  disabled: "neutral",
};

interface ChecklistItemRecord {
  itemCode: string;
  itemName: string;
  description: string | null;
  isRequired: boolean;
  sort: number;
  isSatisfied: boolean;
  checkedAt: string | null;
  remark: string | null;
}

type ProductStatus = "active" | "inactive" | "draft" | "deprecated";
type ProductOrigin = "self" | "third_party" | "other";

interface ProductRecord {
  id: string;
  productCode: string;
  productType: string;
  categoryId: number | null;
  productName: string;
  productNick: string | null;
  description: string | null;
  capabilityKeys: string[];
  tags: string[];
  standaloneSubscribable: boolean;
  status: ProductStatus;
  isCustomerVisible: boolean;
  isWorkforceVisible: boolean;
  origin: ProductOrigin;
  originProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductCategoryRecord {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: "启用",
  draft: "草稿",
  inactive: "停用",
  deprecated: "已弃用",
};

const STATUS_TONE: Record<ProductStatus, StatusBadgeTone> = {
  active: "success",
  draft: "neutral",
  inactive: "warning",
  deprecated: "danger",
};

const ORIGIN_LABELS: Record<ProductOrigin, string> = {
  self: "平台自建",
  third_party: "第三方接入",
  other: "其他",
};

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; row: ProductRecord }
  | null;

interface ProductDraft {
  productCode: string;
  productType: string;
  categoryId: string;
  productName: string;
  productNick: string;
  description: string;
  origin: ProductOrigin;
  originProvider: string;
  standaloneSubscribable: boolean;
  isCustomerVisible: boolean;
  isWorkforceVisible: boolean;
}

const EMPTY_DRAFT: ProductDraft = {
  productCode: "",
  productType: "",
  categoryId: "",
  productName: "",
  productNick: "",
  description: "",
  origin: "self",
  originProvider: "",
  standaloneSubscribable: true,
  isCustomerVisible: true,
  isWorkforceVisible: true,
};

function draftFromRecord(row: ProductRecord): ProductDraft {
  return {
    productCode: row.productCode,
    productType: row.productType,
    categoryId: row.categoryId != null ? String(row.categoryId) : "",
    productName: row.productName,
    productNick: row.productNick ?? "",
    description: row.description ?? "",
    origin: row.origin,
    originProvider: row.originProvider ?? "",
    standaloneSubscribable: row.standaloneSubscribable,
    isCustomerVisible: row.isCustomerVisible,
    isWorkforceVisible: row.isWorkforceVisible,
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof OperaApiError && error.message
    ? { description: error.message }
    : {};
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export default function ProductsPage() {
  const { toast } = useToast();
  const { can } = useOperatorSession();
  const canManage = can(MANAGE);

  const [rows, setRows] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<ProductCategoryRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | ProductOrigin>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>(
    "all",
  );
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const [clientsProduct, setClientsProduct] = useState<ProductRecord | null>(
    null,
  );
  const [clients, setClients] = useState<OidcClientRecord[]>([]);
  const [clientsLoad, setClientsLoad] = useState<LoadState>({
    kind: "ready",
  });
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [clientDraft, setClientDraft] =
    useState<ClientDraft>(DEFAULT_CLIENT_DRAFT);
  const [revealSecret, setRevealSecret] = useState<{
    clientId: string;
    secret: string;
    rotated: boolean;
  } | null>(null);

  const [checklistProduct, setChecklistProduct] =
    useState<ProductRecord | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItemRecord[]>([]);
  const [checklistLoad, setChecklistLoad] = useState<LoadState>({
    kind: "ready",
  });

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const [products, cats] = await Promise.all([
        api.get<ProductRecord[]>("/api/products"),
        api.get<ProductCategoryRecord[]>("/api/products/categories"),
      ]);
      setRows(products);
      setCategories(cats);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取产品目录失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadClients = useCallback(async (productId: string) => {
    setClientsLoad({ kind: "loading" });
    try {
      const data = await api.get<OidcClientRecord[]>(
        `/api/oidc-clients?productId=${encodeURIComponent(productId)}`,
      );
      setClients(data);
      setClientsLoad({ kind: "ready" });
    } catch (error) {
      setClientsLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取客户端失败",
      });
    }
  }, []);

  function openClients(product: ProductRecord) {
    setClientsProduct(product);
    void loadClients(product.id);
  }

  function closeClients() {
    setClientsProduct(null);
    setClients([]);
  }

  function openCreateClient() {
    setClientDraft({
      ...DEFAULT_CLIENT_DRAFT,
      clientId: clientsProduct?.productCode ?? "",
      name: clientsProduct?.productName ?? "",
    });
    setCreateClientOpen(true);
  }

  async function submitCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientsProduct) return;
    const redirectUris = clientDraft.redirectUris
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter(Boolean);
    const allowedScopes = clientDraft.allowedScopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const created = await api.post<
        OidcClientRecord & { clientSecret: string }
      >("/api/oidc-clients", {
        productId: clientsProduct.id,
        clientId: clientDraft.clientId.trim(),
        releaseChannel: clientDraft.releaseChannel,
        name: clientDraft.name.trim(),
        displayName: clientDraft.displayName.trim() || null,
        redirectUris,
        allowedScopes,
        pkceRequired: clientDraft.pkceRequired,
      });
      setCreateClientOpen(false);
      setRevealSecret({
        clientId: created.clientId,
        secret: created.clientSecret,
        rotated: false,
      });
      await loadClients(clientsProduct.id);
    } catch (error) {
      toast({ tone: "danger", title: "注册失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function rotateClientSecret(clientId: string) {
    if (!clientsProduct) return;
    setSubmitting(true);
    try {
      const result = await api.post<{ clientId: string; clientSecret: string }>(
        `/api/oidc-clients/${encodeURIComponent(clientId)}/rotate-secret`,
      );
      setRevealSecret({
        clientId: result.clientId,
        secret: result.clientSecret,
        rotated: true,
      });
    } catch (error) {
      toast({ tone: "danger", title: "轮换失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleClientStatus(clientId: string, status: ClientStatus) {
    if (!clientsProduct) return;
    setSubmitting(true);
    try {
      await api.patch(
        `/api/oidc-clients/${encodeURIComponent(clientId)}/status`,
        {
          status,
        },
      );
      toast({
        tone: "success",
        title: `${clientId} 已${status === "active" ? "启用" : "禁用"}`,
      });
      await loadClients(clientsProduct.id);
    } catch (error) {
      toast({ tone: "danger", title: "操作失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      toast({ tone: "success", title: "已复制到剪贴板" });
    } catch {
      toast({
        tone: "danger",
        title: "复制失败",
        description: "浏览器拒绝了剪贴板访问，请手动选中复制。",
      });
    }
  }

  const loadChecklist = useCallback(async (productId: string) => {
    setChecklistLoad({ kind: "loading" });
    try {
      const data = await api.get<ChecklistItemRecord[]>(
        `/api/products/${encodeURIComponent(productId)}/checklist`,
      );
      setChecklist(data);
      setChecklistLoad({ kind: "ready" });
    } catch (error) {
      setChecklistLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取检查单失败",
      });
    }
  }, []);

  function openChecklist(product: ProductRecord) {
    setChecklistProduct(product);
    void loadChecklist(product.id);
  }

  function closeChecklist() {
    setChecklistProduct(null);
    setChecklist([]);
  }

  async function toggleChecklistItem(itemCode: string, isSatisfied: boolean) {
    if (!checklistProduct) return;
    setSubmitting(true);
    try {
      await api.patch(
        `/api/products/${checklistProduct.id}/checklist/${itemCode}`,
        { isSatisfied },
      );
      await loadChecklist(checklistProduct.id);
    } catch (error) {
      toast({ tone: "danger", title: "更新失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (originFilter === "all" || r.origin === originFilter) &&
        (statusFilter === "all" || r.status === statusFilter) &&
        (kw === "" ||
          r.productCode.toLowerCase().includes(kw) ||
          r.productName.toLowerCase().includes(kw)),
    );
  }, [rows, keyword, originFilter, statusFilter]);

  const pager = useListPagination(filtered);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setDialog({ kind: "create" });
  }

  function openEdit(row: ProductRecord) {
    setDraft(draftFromRecord(row));
    setDialog({ kind: "edit", row });
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    setSubmitting(true);
    try {
      await action();
      toast({ tone: "success", title: label });
      await reload();
    } catch (error) {
      toast({ tone: "danger", title: `${label}失败`, ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;

    const payload = {
      productCode: draft.productCode.trim(),
      productType: draft.productType.trim(),
      categoryId: draft.categoryId ? Number(draft.categoryId) : null,
      productName: draft.productName.trim(),
      productNick: draft.productNick.trim() || null,
      description: draft.description.trim() || null,
      origin: draft.origin,
      originProvider:
        draft.origin === "third_party" ? draft.originProvider.trim() : null,
      standaloneSubscribable: draft.standaloneSubscribable,
      isCustomerVisible: draft.isCustomerVisible,
      isWorkforceVisible: draft.isWorkforceVisible,
    };

    setSubmitting(true);
    try {
      if (dialog.kind === "create") {
        await api.post("/api/products", payload);
        toast({
          tone: "success",
          title: `${draft.productCode} 已登记（草稿）`,
        });
      } else {
        await api.put(`/api/products/${dialog.row.id}`, payload);
        toast({ tone: "success", title: `${draft.productCode} 已保存` });
      }
      setDialog(null);
      await reload();
    } catch (error) {
      toast({ tone: "danger", title: "保存失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  const draftValid =
    draft.productCode.trim() !== "" &&
    draft.productType.trim() !== "" &&
    draft.productName.trim() !== "" &&
    (draft.origin !== "third_party" || draft.originProvider.trim() !== "");
  const editing = dialog?.kind === "edit";

  const pagination = (
    <Pagination
      className="w-full"
      page={pager.page}
      pageCount={pager.pageCount}
      total={rows.length}
      filteredTotal={filtered.length}
      pageSize={pager.pageSize}
      onPageSizeChange={pager.onPageSizeChange}
      onPageChange={pager.onPageChange}
    />
  );

  const emptyState =
    load.kind === "loading" ? (
      <EmptyState title="读取中…" description="正在读取产品目录。" />
    ) : load.kind === "error" ? (
      <EmptyState
        title="读取失败"
        description={load.message}
        action={
          <Button variant="secondary" onClick={() => void reload()}>
            重试
          </Button>
        }
      />
    ) : filtered.length !== rows.length ? (
      <EmptyState
        title="没有匹配的产品"
        description="换个关键词或筛选条件再看。"
      />
    ) : (
      <EmptyState title="暂无产品" description="点击「登记产品」开始。" />
    );

  return (
    <>
      <ListPageTemplate
        header={
          <ViewHeader
            icon="package"
            title="产品目录"
            description="平台产品的基础设施登记；数据来自 product.products。商业定价/套餐发布仍在 admin。"
            action={
              canManage ? (
                <Button onClick={openCreate} disabled={submitting}>
                  <Icon name="plus" size="sm" aria-hidden="true" />
                  登记产品
                </Button>
              ) : null
            }
          />
        }
        filters={
          <FilterBar
            count={
              filtered.length === rows.length
                ? rows.length
                : `${filtered.length} / ${rows.length}`
            }
          >
            <InputGroup className="grow basis-media-3xl max-w-panel-sm">
              <InputGroupAddon>
                <Icon name="search" size="sm" aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="搜索产品…"
                aria-label="搜索产品"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  pager.resetPage();
                }}
              />
            </InputGroup>
            <NativeSelect
              wrapperClassName="w-fit"
              value={originFilter}
              onChange={(e) => {
                setOriginFilter(e.target.value as typeof originFilter);
                pager.resetPage();
              }}
              aria-label="来源筛选"
            >
              <option value="all">全部来源</option>
              <option value="self">平台自建</option>
              <option value="third_party">第三方接入</option>
              <option value="other">其他</option>
            </NativeSelect>
            <NativeSelect
              wrapperClassName="w-fit"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                pager.resetPage();
              }}
              aria-label="状态筛选"
            >
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="draft">草稿</option>
              <option value="inactive">停用</option>
              <option value="deprecated">已弃用</option>
            </NativeSelect>
          </FilterBar>
        }
        table={
          <DataTable
            columns={[
              {
                id: "name",
                header: "产品",
                cell: (r: ProductRecord) => (
                  <TableTitleCell
                    icon="package"
                    title={r.productName}
                    description={r.productCode}
                    {...(canManage ? { onTitleClick: () => openEdit(r) } : {})}
                  />
                ),
              },
              {
                id: "type",
                header: "类型",
                cell: (r: ProductRecord) => (
                  <span className="text-code-sm">{r.productType}</span>
                ),
              },
              {
                id: "origin",
                header: "来源",
                cell: (r: ProductRecord) => (
                  <span className="text-body-sm">
                    {ORIGIN_LABELS[r.origin]}
                    {r.origin === "third_party" && r.originProvider
                      ? ` · ${r.originProvider}`
                      : ""}
                  </span>
                ),
              },
              {
                id: "status",
                header: "状态",
                align: "center",
                cell: (r: ProductRecord) => (
                  <StatusBadge tone={STATUS_TONE[r.status]} dot>
                    {STATUS_LABELS[r.status]}
                  </StatusBadge>
                ),
              },
              {
                id: "visibility",
                header: "可见性",
                cell: (r: ProductRecord) => (
                  <span className="text-body-sm text-muted-foreground">
                    {r.isCustomerVisible ? "客户端" : ""}
                    {r.isCustomerVisible && r.isWorkforceVisible ? " / " : ""}
                    {r.isWorkforceVisible ? "运营端" : ""}
                    {!r.isCustomerVisible && !r.isWorkforceVisible ? "—" : ""}
                  </span>
                ),
              },
            ]}
            rows={pager.pageRows}
            rowKey={(r: ProductRecord) => r.id}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            indexStart={pager.indexStart}
            {...(canManage
              ? {
                  rowActions: (r: ProductRecord) => (
                    <ActionMenu
                      label={`${r.productName} 操作`}
                      disabled={submitting}
                      items={[
                        {
                          id: "edit",
                          label: "编辑",
                          icon: "edit",
                          onSelect: () => openEdit(r),
                        },
                        {
                          id: "oidc-clients",
                          label: "OIDC 客户端",
                          icon: "key",
                          onSelect: () => openClients(r),
                        },
                        {
                          id: "checklist",
                          label: "接入检查单",
                          icon: "list-checks" as const,
                          onSelect: () => openChecklist(r),
                        },
                        {
                          id: "admin-atlas-grants",
                          label: "Atlas 模型授权（admin）",
                          icon: "external-link" as const,
                          separatorBefore: true,
                          onSelect: () =>
                            window.open(
                              buildAdminAtlasGrantsUrl(),
                              "_blank",
                              "noopener,noreferrer",
                            ),
                        },
                        {
                          id: "admin-runos-bundles",
                          label: "Runos 能力授权（规划中）",
                          icon: "external-link" as const,
                          disabled: true,
                          onSelect: () =>
                            toast({
                              tone: "info",
                              title: "规划中",
                              description:
                                "Runos 的商业层（commerce/bundles）还没建，admin 侧没有对应页面可跳。",
                            }),
                        },
                        ...(
                          [
                            "active",
                            "draft",
                            "inactive",
                            "deprecated",
                          ] as ProductStatus[]
                        )
                          .filter((s) => s !== r.status)
                          .map((s) => ({
                            id: `status-${s}`,
                            label: `切到「${STATUS_LABELS[s]}」`,
                            icon: "refresh" as const,
                            separatorBefore: s === "active",
                            onSelect: () =>
                              void runAction(
                                `${r.productName} 已切到「${STATUS_LABELS[s]}」`,
                                () =>
                                  api.patch(`/api/products/${r.id}/status`, {
                                    status: s,
                                  }),
                              ),
                          })),
                      ]}
                    />
                  ),
                }
              : {})}
            footer={pagination}
            empty={emptyState}
          />
        }
      />

      <DialogForm
        open={dialog?.kind === "create" || editing}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={editing ? "编辑产品" : "登记产品"}
        description={
          editing
            ? undefined
            : "新产品默认落草稿状态；确认信息无误后从操作菜单切到「启用」。"
        }
        submitLabel={editing ? "保存" : "登记"}
        submitting={submitting}
        submitDisabled={!draftValid}
        onSubmit={submit}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2xs">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-md">
              <Field>
                <FieldLabel htmlFor="product-code">Product Code</FieldLabel>
                <Input
                  id="product-code"
                  value={draft.productCode}
                  onChange={(e) =>
                    setDraft({ ...draft, productCode: e.target.value })
                  }
                  placeholder="karda"
                  disabled={editing}
                  className="font-mono"
                />
                <FieldDescription>全局唯一，登记后不可改。</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="product-type">类型</FieldLabel>
                <Input
                  id="product-type"
                  value={draft.productType}
                  onChange={(e) =>
                    setDraft({ ...draft, productType: e.target.value })
                  }
                  placeholder="knowledge_platform"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <Field>
                <FieldLabel htmlFor="product-name">名称</FieldLabel>
                <Input
                  id="product-name"
                  value={draft.productName}
                  onChange={(e) =>
                    setDraft({ ...draft, productName: e.target.value })
                  }
                  placeholder="Karda"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="product-nick">副名 / 译名</FieldLabel>
                <Input
                  id="product-nick"
                  value={draft.productNick}
                  onChange={(e) =>
                    setDraft({ ...draft, productNick: e.target.value })
                  }
                  placeholder="卡尔达"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="product-category">品类</FieldLabel>
              <NativeSelect
                id="product-category"
                value={draft.categoryId}
                onChange={(e) =>
                  setDraft({ ...draft, categoryId: e.target.value })
                }
              >
                <option value="">未分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-description">简介</FieldLabel>
              <Textarea
                id="product-description"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={2}
              />
            </Field>

            <div className="grid grid-cols-2 gap-md">
              <Field>
                <FieldLabel htmlFor="product-origin">来源</FieldLabel>
                <NativeSelect
                  id="product-origin"
                  value={draft.origin}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      origin: e.target.value as ProductOrigin,
                    })
                  }
                >
                  <option value="self">平台自建</option>
                  <option value="third_party">第三方接入</option>
                  <option value="other">其他</option>
                </NativeSelect>
              </Field>
              {draft.origin === "third_party" ? (
                <Field>
                  <FieldLabel htmlFor="product-origin-provider">
                    来源方
                  </FieldLabel>
                  <Input
                    id="product-origin-provider"
                    value={draft.originProvider}
                    onChange={(e) =>
                      setDraft({ ...draft, originProvider: e.target.value })
                    }
                    placeholder="公司 / 团队名"
                  />
                </Field>
              ) : null}
            </div>

            <div className="flex flex-col gap-sm rounded-md border border-border p-sm">
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="product-standalone">可独立订阅</FieldLabel>
                <Switch
                  id="product-standalone"
                  checked={draft.standaloneSubscribable}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, standaloneSubscribable: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="product-visible-customer">
                  客户端可见
                </FieldLabel>
                <Switch
                  id="product-visible-customer"
                  checked={draft.isCustomerVisible}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, isCustomerVisible: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="product-visible-workforce">
                  运营端可见
                </FieldLabel>
                <Switch
                  id="product-visible-workforce"
                  checked={draft.isWorkforceVisible}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, isWorkforceVisible: v })
                  }
                />
              </div>
            </div>
          </FieldGroup>
        </div>
      </DialogForm>

      {/* ── OIDC 客户端抽屉（挂在某个产品下）───────────────────────────────── */}
      <Drawer
        open={clientsProduct !== null}
        onClose={closeClients}
        width={560}
        title={
          clientsProduct
            ? `OIDC 客户端 · ${clientsProduct.productName}`
            : undefined
        }
        description={clientsProduct ? clientsProduct.productCode : undefined}
      >
        {clientsLoad.kind === "loading" ? (
          <EmptyState title="读取中…" description="正在读取客户端列表。" />
        ) : clientsLoad.kind === "error" ? (
          <EmptyState
            title="读取失败"
            description={clientsLoad.message}
            action={
              <Button
                variant="secondary"
                onClick={() =>
                  clientsProduct && void loadClients(clientsProduct.id)
                }
              >
                重试
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-lg">
            <Banner
              tone="info"
              title="realm 恒为 customer"
              description="产品客户端不走 workforce realm——那是平台自己门户（admin/opera/console/website）专用。client secret 只在注册/轮换时明文出现一次，关掉提示框后就再也拿不回来。"
            />
            <Section
              title="已注册客户端"
              icon="key"
              level={2}
              description="C1 身份接入的登记记录；一个产品可以有多个 release_channel（stable/beta/canary）各自的 client。"
            >
              <div className="flex flex-col gap-sm">
                {clients.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    暂无客户端。
                  </p>
                ) : (
                  clients.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-xs rounded-md border border-border p-sm"
                    >
                      <div className="flex items-center justify-between gap-sm">
                        <div className="flex items-center gap-sm">
                          <span className="font-mono text-code-sm">
                            {c.clientId}
                          </span>
                          <Badge variant="outline">{c.releaseChannel}</Badge>
                          <StatusBadge tone={CLIENT_STATUS_TONE[c.status]} dot>
                            {c.status === "active" ? "启用" : "禁用"}
                          </StatusBadge>
                        </div>
                        <ActionMenu
                          label={`${c.clientId} 操作`}
                          disabled={submitting}
                          items={[
                            {
                              id: "rotate",
                              label: "轮换密钥",
                              icon: "refresh",
                              onSelect: () =>
                                void rotateClientSecret(c.clientId),
                            },
                            c.status === "active"
                              ? {
                                  id: "disable",
                                  label: "禁用",
                                  icon: "pause" as const,
                                  danger: true,
                                  separatorBefore: true,
                                  onSelect: () =>
                                    void toggleClientStatus(
                                      c.clientId,
                                      "disabled",
                                    ),
                                }
                              : {
                                  id: "enable",
                                  label: "启用",
                                  icon: "play" as const,
                                  separatorBefore: true,
                                  onSelect: () =>
                                    void toggleClientStatus(
                                      c.clientId,
                                      "active",
                                    ),
                                },
                          ]}
                        />
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        redirect: {c.redirectUris.join(", ")}
                      </div>
                      <div className="text-body-sm text-muted-foreground">
                        scopes: {c.allowedScopes.join(", ") || "—"}
                      </div>
                    </div>
                  ))
                )}
                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={openCreateClient}
                  >
                    <Icon name="plus" size="sm" aria-hidden="true" />
                    注册客户端
                  </Button>
                ) : null}
              </div>
            </Section>
          </div>
        )}
      </Drawer>

      {/* ── 注册客户端 ───────────────────────────────────────────────────── */}
      <DialogForm
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        title={`注册客户端${clientsProduct ? ` · ${clientsProduct.productCode}` : ""}`}
        description="client secret 只在提交成功后展示一次，关闭前先复制。"
        submitLabel="注册"
        submitting={submitting}
        submitDisabled={
          clientDraft.clientId.trim() === "" ||
          clientDraft.redirectUris.trim() === ""
        }
        onSubmit={submitCreateClient}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2xs">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-md">
              <Field>
                <FieldLabel htmlFor="client-id">Client ID</FieldLabel>
                <Input
                  id="client-id"
                  value={clientDraft.clientId}
                  onChange={(e) =>
                    setClientDraft({ ...clientDraft, clientId: e.target.value })
                  }
                  placeholder="acme-agent"
                  className="font-mono"
                />
                <FieldDescription>
                  全局唯一，小写 kebab；同产品多渠道常见 acme-agent-beta。
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="client-channel">渠道</FieldLabel>
                <NativeSelect
                  id="client-channel"
                  value={clientDraft.releaseChannel}
                  onChange={(e) =>
                    setClientDraft({
                      ...clientDraft,
                      releaseChannel: e.target.value as ReleaseChannel,
                    })
                  }
                >
                  <option value="stable">stable</option>
                  <option value="beta">beta</option>
                  <option value="canary">canary</option>
                </NativeSelect>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-md">
              <Field>
                <FieldLabel htmlFor="client-name">Name</FieldLabel>
                <Input
                  id="client-name"
                  value={clientDraft.name}
                  onChange={(e) =>
                    setClientDraft({ ...clientDraft, name: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="client-display-name">
                  展示名（授权页用）
                </FieldLabel>
                <Input
                  id="client-display-name"
                  value={clientDraft.displayName}
                  onChange={(e) =>
                    setClientDraft({
                      ...clientDraft,
                      displayName: e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="client-redirects">Redirect URIs</FieldLabel>
              <Textarea
                id="client-redirects"
                value={clientDraft.redirectUris}
                onChange={(e) =>
                  setClientDraft({
                    ...clientDraft,
                    redirectUris: e.target.value,
                  })
                }
                rows={3}
                placeholder={"https://agent.acme.com/auth/callback"}
                className="font-mono text-code-sm"
              />
              <FieldDescription>
                一行一个，或逗号分隔；至少一个。
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="client-scopes">Allowed Scopes</FieldLabel>
              <Input
                id="client-scopes"
                value={clientDraft.allowedScopes}
                onChange={(e) =>
                  setClientDraft({
                    ...clientDraft,
                    allowedScopes: e.target.value,
                  })
                }
                className="font-mono"
              />
              <FieldDescription>逗号分隔。</FieldDescription>
            </Field>

            <div className="flex items-center justify-between rounded-md border border-border p-sm">
              <FieldLabel htmlFor="client-pkce">强制 PKCE</FieldLabel>
              <Switch
                id="client-pkce"
                checked={clientDraft.pkceRequired}
                onCheckedChange={(v) =>
                  setClientDraft({ ...clientDraft, pkceRequired: v })
                }
              />
            </div>
          </FieldGroup>
        </div>
      </DialogForm>

      {/* ── 明文展示：只有这一次 ─────────────────────────────────────────── */}
      <DialogForm
        open={revealSecret !== null}
        onOpenChange={(open) => {
          if (!open) setRevealSecret(null);
        }}
        title={revealSecret?.rotated ? "新密钥已生成" : "客户端已注册"}
        submitLabel="我已保存"
        cancelLabel="关闭"
        onSubmit={(e) => {
          e.preventDefault();
          setRevealSecret(null);
        }}
      >
        <Banner
          tone="warning"
          title="这是唯一一次看到明文"
          description="关闭后无法再次查看，只能轮换。请立即复制并交给对方妥善保存。"
        />
        <Field>
          <FieldLabel htmlFor="client-secret-reveal">
            {revealSecret?.clientId} · client_secret
          </FieldLabel>
          <div className="flex items-center gap-sm">
            <Input
              id="client-secret-reveal"
              readOnly
              value={revealSecret?.secret ?? ""}
              className="font-mono"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void copySecret(revealSecret?.secret ?? "")}
            >
              <Icon name="copy" size="sm" aria-hidden="true" />
              复制
            </Button>
          </div>
        </Field>
      </DialogForm>

      {/* ── 接入检查单（product_200 §7 六步技术接入）───────────────────────── */}
      <Drawer
        open={checklistProduct !== null}
        onClose={closeChecklist}
        width={560}
        title={
          checklistProduct
            ? `接入检查单 · ${checklistProduct.productName}`
            : undefined
        }
        description={checklistProduct?.productCode}
      >
        {checklistLoad.kind === "loading" ? (
          <EmptyState title="读取中…" description="正在读取检查单。" />
        ) : checklistLoad.kind === "error" ? (
          <EmptyState
            title="读取失败"
            description={checklistLoad.message}
            action={
              <Button
                variant="secondary"
                onClick={() =>
                  checklistProduct && void loadChecklist(checklistProduct.id)
                }
              >
                重试
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-lg">
            <Banner
              tone="info"
              title="只覆盖技术接入六步"
              description="对应 product_200_integration.md §7：目录/C1/C3/C2/数据面/验收。商业检查项（认证策略/定价）归 admin 消费，这里不读不写。C2/C3 是否真的接好，opera 从外面观测不到——勾选是操作员的判断，不是自动检测。"
            />
            <div className="flex flex-col gap-sm">
              {checklist.map((item) => (
                <div
                  key={item.itemCode}
                  className="flex items-start gap-sm rounded-md border border-border p-sm"
                >
                  <Checkbox
                    checked={item.isSatisfied}
                    disabled={submitting || !canManage}
                    onCheckedChange={(checked) =>
                      void toggleChecklistItem(item.itemCode, checked === true)
                    }
                  />
                  <div className="flex flex-1 flex-col gap-2xs">
                    <div className="flex items-center gap-sm">
                      <span className="text-body-md font-medium">
                        {item.itemName}
                      </span>
                      {item.isRequired ? (
                        <Badge variant="outline">必需</Badge>
                      ) : null}
                    </div>
                    {item.description ? (
                      <span className="text-body-sm text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                    {item.checkedAt ? (
                      <span className="text-body-sm text-muted-foreground">
                        {new Date(item.checkedAt).toLocaleString("zh-CN")} 确认
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
