"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  DialogForm,
  Icon,
  Input,
  Label,
  NativeSelect,
  Pagination,
  Textarea,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
  useToast,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  activateModelPriceRule,
  activateModelProvider,
  createAiModel,
  createModelPriceRule,
  createModelProvider,
  deactivateModelPriceRule,
  deactivateModelProvider,
  deleteAiModel,
  deleteModelProvider,
  fetchAiModels,
  fetchModelPolicies,
  fetchModelPriceRules,
  fetchModelProviders,
  fetchTenantModelQuotas,
  fetchTenantModelUsageSummaries,
  setAiModelActive,
  updateAiModel,
  updateModelPriceRule,
  updateModelProvider,
  type ModelPriceRuleWriteInput,
} from "@/api/admin-bff";
import type {
  AiModelRecord,
  ModelPolicyRecord,
  ModelPriceRuleRecord,
  ModelProviderRecord,
  TenantQuotaRecord,
  TenantUsageSummaryRecord,
} from "@/entities/console";
import { useConsoleTranslations } from "@/lib/ConsoleIntl";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";

type ViewMode = "list" | "cards";
type ModelStatusFilter = "all" | "active" | "inactive";
type ModelSourceFilter = "all" | "online" | "private";
type DialogMode = "createModel" | "editModel" | null;
type Feedback = {
  tone: "success" | "error";
  key: string;
  values?: Record<string, number | string>;
} | null;
type ModelLinkStatus = "normal" | "abnormal" | "checking";

const PROVIDER_OPTIONS = ["doubao", "claude", "private", "custom"] as const;
const PROTOCOL_OPTIONS = [
  "openai-compatible",
  "anthropic-messages",
  "custom",
] as const;
const LINK_CHECK_MIN_FEEDBACK_MS = 650;

function defaultModelForm() {
  return {
    modelCode: "",
    modelName: "",
    provider: "doubao",
    endpointUrl: "",
    protocol: "openai-compatible",
    capabilities: "text",
    keyReferenceName: "",
    configText: "",
  };
}

type ProviderDialogState = {
  mode: "create" | "edit";
  id: string | null;
} | null;
type PriceRuleDialogState = {
  mode: "create" | "edit";
  id: string | null;
} | null;

interface ProviderForm {
  providerCode: string;
  providerName: string;
  providerType: string;
  description: string;
  logoUrl: string;
  homepageUrl: string;
  consoleUrl: string;
  billingUrl: string;
}

interface PriceRuleForm {
  modelId: string;
  billingMode: string;
  currency: string;
  unitTokens: string;
  inputUnitPrice: string;
  outputUnitPrice: string;
  requestUnitPrice: string;
  effectiveAt: string;
  expiresAt: string;
}

function defaultProviderForm(): ProviderForm {
  return {
    providerCode: "",
    providerName: "",
    providerType: "online",
    description: "",
    logoUrl: "",
    homepageUrl: "",
    consoleUrl: "",
    billingUrl: "",
  };
}

function providerFormFromRecord(provider: ModelProviderRecord): ProviderForm {
  return {
    providerCode: provider.providerCode,
    providerName: provider.providerName,
    providerType: provider.providerType,
    description: provider.description ?? "",
    logoUrl: provider.logoUrl ?? "",
    homepageUrl: provider.homepageUrl ?? "",
    consoleUrl: provider.consoleUrl ?? "",
    billingUrl: provider.billingUrl ?? "",
  };
}

function defaultPriceRuleForm(modelId: string): PriceRuleForm {
  return {
    modelId,
    billingMode: "token",
    currency: "CNY",
    unitTokens: "1000000",
    inputUnitPrice: "0",
    outputUnitPrice: "0",
    requestUnitPrice: "0",
    effectiveAt: "",
    expiresAt: "",
  };
}

function priceRuleFormFromRecord(rule: ModelPriceRuleRecord): PriceRuleForm {
  return {
    modelId: rule.modelId,
    billingMode: rule.billingMode,
    currency: rule.currency,
    unitTokens: String(rule.unitTokens),
    inputUnitPrice: rule.inputUnitPrice,
    outputUnitPrice: rule.outputUnitPrice,
    requestUnitPrice: rule.requestUnitPrice,
    effectiveAt: toDateTimeLocal(rule.effectiveAt),
    expiresAt: toDateTimeLocal(rule.expiresAt),
  };
}

// 把后端 ISO 时间转成 datetime-local 输入控件的本地墙钟值，保证编辑回填后再提交
// 能还原为同一时刻（避免直接截断 UTC 字符串造成的时区偏移累积）。
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

function isPrivateProvider(provider: string) {
  return ["private", "custom", "self-hosted"].includes(provider);
}

function modelSearchText(model: AiModelRecord) {
  return [
    model.modelName,
    model.modelCode,
    model.provider,
    model.protocol,
    model.endpointUrl,
    model.keyReference?.name ?? "",
    ...model.capabilities,
  ]
    .join(" ")
    .toLowerCase();
}

function configToText(config: Record<string, unknown> | null) {
  return config ? JSON.stringify(config, null, 2) : "";
}

function parseCapabilities(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseConfig(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;

  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Model config must be a JSON object");
  }

  return parsed as Record<string, unknown>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function modelTone(model: AiModelRecord) {
  if (!model.isActive) return "muted";
  return isPrivateProvider(model.provider) ? "private" : "active";
}

function detectModelLinkStatus(model: AiModelRecord): ModelLinkStatus {
  return model.endpointUrl.trim() &&
    model.protocol.trim() &&
    (model.keyReference === null || model.keyReference.configured)
    ? "normal"
    : "abnormal";
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
      ),
    )
  );
}

function ModelSummaryItem({
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
      <Icon name={icon} size={24} fallback="placeholder" />
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

function ModelOperationButtons({
  model,
  submitting,
  onEnable,
  onDisable,
  onDelete,
}: {
  model: AiModelRecord;
  submitting: boolean;
  onEnable: (model: AiModelRecord) => void;
  onDisable: (model: AiModelRecord) => void;
  onDelete: (model: AiModelRecord) => void;
}) {
  return (
    <div
      className="vx-model-operation-buttons"
      aria-label={`${model.modelName} 操作`}
    >
      <Button
        variant="ghost"
        size="icon"
        title="启用"
        aria-label={`启用 ${model.modelName}`}
        disabled={submitting || model.isActive}
        onClick={() => onEnable(model)}
      >
        <Icon name="play" size={24} fallback="placeholder" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="停用"
        aria-label={`停用 ${model.modelName}`}
        disabled={submitting || !model.isActive}
        onClick={() => onDisable(model)}
      >
        <Icon name="stop" size={24} fallback="placeholder" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={model.isActive ? "启用状态不可删除" : "删除"}
        aria-label={`删除 ${model.modelName}`}
        className="vx-model-operation-buttons__danger"
        disabled={submitting || model.isActive}
        onClick={() => onDelete(model)}
      >
        <Icon name="trash" size={24} fallback="placeholder" />
      </Button>
    </div>
  );
}

function ModelBatchOperationButtons({
  canEnable,
  canDisable,
  canDelete,
  submitting,
  onEnable,
  onDisable,
  onDelete,
}: {
  canEnable: boolean;
  canDisable: boolean;
  canDelete: boolean;
  submitting: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="vx-model-operation-buttons vx-model-batch-actions"
      aria-label="批量操作"
    >
      <Button
        variant="ghost"
        size="icon"
        title="批量启用"
        aria-label="批量启用"
        disabled={submitting || !canEnable}
        onClick={onEnable}
      >
        <Icon
          name="play"
          size={24}
          weight={canEnable && !submitting ? "fill" : "regular"}
          fallback="placeholder"
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="批量停用"
        aria-label="批量停用"
        disabled={submitting || !canDisable}
        onClick={onDisable}
      >
        <Icon
          name="stop"
          size={24}
          weight={canDisable && !submitting ? "fill" : "regular"}
          fallback="placeholder"
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="批量删除"
        aria-label="批量删除"
        className="vx-model-operation-buttons__danger"
        disabled={submitting || !canDelete}
        onClick={onDelete}
      >
        <Icon
          name="trash"
          size={24}
          weight={canDelete && !submitting ? "fill" : "regular"}
          fallback="placeholder"
        />
      </Button>
    </div>
  );
}

export function ModelPlatformPage() {
  const t = useConsoleTranslations("modelPlatformPage");
  const { toast } = useToast();
  const [models, setModels] = useState<AiModelRecord[]>([]);
  const [providers, setProviders] = useState<ModelProviderRecord[]>([]);
  const [priceRules, setPriceRules] = useState<ModelPriceRuleRecord[]>([]);
  const [policies, setPolicies] = useState<ModelPolicyRecord[]>([]);
  const [quotas, setQuotas] = useState<TenantQuotaRecord[]>([]);
  const [usageSummaries, setUsageSummaries] = useState<
    TenantUsageSummaryRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [detectingLinks, setDetectingLinks] = useState(false);
  const [linkStatusByModelId, setLinkStatusByModelId] = useState<
    Record<string, ModelLinkStatus>
  >({});
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModelStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<ModelSourceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [modelForm, setModelForm] = useState(defaultModelForm);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [providerDialog, setProviderDialog] =
    useState<ProviderDialogState>(null);
  const [providerForm, setProviderForm] =
    useState<ProviderForm>(defaultProviderForm);
  const [pendingDeleteProvider, setPendingDeleteProvider] =
    useState<ModelProviderRecord | null>(null);
  const [priceRuleDialog, setPriceRuleDialog] =
    useState<PriceRuleDialogState>(null);
  const [priceRuleForm, setPriceRuleForm] = useState<PriceRuleForm>(() =>
    defaultPriceRuleForm(""),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      fetchAiModels(true),
      fetchModelProviders(true),
      fetchModelPriceRules({ includeInactive: true }),
      fetchModelPolicies({ includeInactive: true }),
      fetchTenantModelQuotas({ includeExpired: true }),
      fetchTenantModelUsageSummaries(),
    ])
      .then(
        ([
          records,
          providerRecords,
          priceRuleRecords,
          policyRecords,
          quotaRecords,
          usageRecords,
        ]) => {
          if (!active) return;
          setModels(records);
          setProviders(providerRecords);
          setPriceRules(priceRuleRecords);
          setPolicies(policyRecords);
          setQuotas(quotaRecords);
          setUsageSummaries(usageRecords);
          setLinkStatusByModelId(
            Object.fromEntries(
              records.map((model) => [model.id, detectModelLinkStatus(model)]),
            ),
          );
          setSelectedModelId(null);
        },
      )
      .catch(() => {
        if (active) setFeedback({ tone: "error", key: "feedback.loadError" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, query, sourceFilter, statusFilter, viewMode]);

  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return models.filter((model) => {
      const matchesQuery =
        !normalizedQuery || modelSearchText(model).includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && model.isActive) ||
        (statusFilter === "inactive" && !model.isActive);
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "online" && !isPrivateProvider(model.provider)) ||
        (sourceFilter === "private" && isPrivateProvider(model.provider));

      return matchesQuery && matchesStatus && matchesSource;
    });
  }, [models, query, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedModels = filteredModels.slice(pageStart, pageStart + pageSize);
  const pagedModelIds = pagedModels.map((model) => model.id);
  const selectedOnPage = pagedModelIds.filter((id) =>
    selectedModelIds.has(id),
  ).length;
  const isPageSelected =
    pagedModelIds.length > 0 && selectedOnPage === pagedModelIds.length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < pagedModelIds.length;
  const selectedModel = selectedModelId
    ? (modelById.get(selectedModelId) ?? null)
    : null;
  const selectedModels = [...selectedModelIds]
    .map((modelId) => modelById.get(modelId))
    .filter((model): model is AiModelRecord => Boolean(model));
  const canBatchEnable = selectedModels.some((model) => !model.isActive);
  const canBatchDisable = selectedModels.some((model) => model.isActive);
  const canBatchDelete =
    selectedModels.length > 0 &&
    selectedModels.every((model) => !model.isActive);
  const activeModels = models.filter((model) => model.isActive).length;
  const inactiveModels = models.length - activeModels;
  const privateModels = models.filter((model) =>
    isPrivateProvider(model.provider),
  ).length;
  const onlineModels = models.length - privateModels;
  const activeProviders = providers.filter((provider) => provider.isActive);
  const activePolicies = policies.filter((policy) => policy.isActive);
  const activePriceRules = priceRules.filter((rule) => rule.isActive);
  const activeQuotas = quotas.filter((quota) => quota.isActive);
  const totalUsageTokens = usageSummaries.reduce(
    (total, summary) => total + Number(summary.totalTokens || 0),
    0,
  );

  const statusFilters = [
    { value: "all", label: t("filters.all") },
    { value: "active", label: t("filters.active") },
    { value: "inactive", label: t("filters.inactive") },
  ] as const;
  const sourceFilters = [
    { value: "all", label: t("filters.all") },
    { value: "online", label: t("filters.online") },
    { value: "private", label: t("filters.private") },
  ] as const;

  function resetFeedback() {
    setFeedback(null);
  }

  function providerLabel(provider: string) {
    const label = t(`providers.${provider}`);
    return label.startsWith("modelPlatformPage.providers.") ? provider : label;
  }

  function handleReset() {
    setQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
  }

  async function reload(nextModelId?: string | null) {
    const records = await fetchAiModels(true);
    setModels(records);
    setLinkStatusByModelId(
      Object.fromEntries(
        records.map((model) => [model.id, detectModelLinkStatus(model)]),
      ),
    );
    setSelectedModelId(nextModelId ?? null);
    setSelectedModelIds((current) => {
      const availableIds = new Set(records.map((model) => model.id));
      return new Set([...current].filter((id) => availableIds.has(id)));
    });
  }

  function openCreateModelDialog() {
    setModelForm(defaultModelForm());
    resetFeedback();
    setDialogMode("createModel");
  }

  function openEditModelDialog(model: AiModelRecord) {
    setSelectedModelId(model.id);
    setModelForm({
      modelCode: model.modelCode,
      modelName: model.modelName,
      provider: model.provider,
      endpointUrl: model.endpointUrl,
      protocol: model.protocol,
      capabilities: model.capabilities.join(", "),
      keyReferenceName: model.keyReference?.name ?? "",
      configText: configToText(model.config),
    });
    resetFeedback();
    setDialogMode("editModel");
  }

  async function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    resetFeedback();

    try {
      const payload = {
        modelCode: modelForm.modelCode,
        modelName: modelForm.modelName,
        provider: modelForm.provider,
        endpointUrl: modelForm.endpointUrl,
        protocol: modelForm.protocol,
        capabilities: parseCapabilities(modelForm.capabilities),
        keyReference: {
          source: "env" as const,
          name: modelForm.keyReferenceName,
        },
        config: parseConfig(modelForm.configText),
      };

      if (dialogMode === "createModel") {
        const created = await createAiModel(payload);
        await reload(created.id);
        setFeedback({ tone: "success", key: "feedback.modelCreated" });
      } else if (dialogMode === "editModel" && selectedModel) {
        const updated = await updateAiModel(selectedModel.id, payload);
        await reload(updated.id);
        setFeedback({ tone: "success", key: "feedback.modelUpdated" });
      }

      setDialogMode(null);
    } catch {
      setFeedback({ tone: "error", key: "feedback.modelSaveError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleModel(model: AiModelRecord) {
    setSubmitting(true);
    resetFeedback();

    try {
      const updated = await setAiModelActive(model.id, !model.isActive);
      setModels((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setLinkStatusByModelId((current) => ({
        ...current,
        [updated.id]: detectModelLinkStatus(updated),
      }));
      setSelectedModelId(updated.id);
    } catch {
      setFeedback({ tone: "error", key: "feedback.modelStateError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteModel(model: AiModelRecord) {
    if (model.isActive) return;
    if (!window.confirm(t("feedback.deleteConfirm", { name: model.modelName })))
      return;

    setSubmitting(true);
    resetFeedback();

    try {
      await deleteAiModel(model.id);
      await reload(null);
      setSelectedModelIds((current) => {
        const next = new Set(current);
        next.delete(model.id);
        return next;
      });
      setFeedback({ tone: "success", key: "feedback.modelDeleted" });
    } catch {
      setFeedback({ tone: "error", key: "feedback.modelDeleteError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBatchEnableModels() {
    const targets = selectedModels.filter((model) => !model.isActive);
    if (!targets.length) return;

    setSubmitting(true);
    resetFeedback();

    try {
      const updatedModels = await Promise.all(
        targets.map((model) => setAiModelActive(model.id, true)),
      );
      const updatedById = new Map(
        updatedModels.map((model) => [model.id, model]),
      );
      setModels((current) =>
        current.map((item) => updatedById.get(item.id) ?? item),
      );
      setLinkStatusByModelId((current) => ({
        ...current,
        ...Object.fromEntries(
          updatedModels.map((model) => [
            model.id,
            detectModelLinkStatus(model),
          ]),
        ),
      }));
      setSelectedModelId(updatedModels[0]?.id ?? null);
    } catch {
      setFeedback({ tone: "error", key: "feedback.modelStateError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBatchDisableModels() {
    const targets = selectedModels.filter((model) => model.isActive);
    if (!targets.length) return;

    setSubmitting(true);
    resetFeedback();

    try {
      const updatedModels = await Promise.all(
        targets.map((model) => setAiModelActive(model.id, false)),
      );
      const updatedById = new Map(
        updatedModels.map((model) => [model.id, model]),
      );
      setModels((current) =>
        current.map((item) => updatedById.get(item.id) ?? item),
      );
      setLinkStatusByModelId((current) => ({
        ...current,
        ...Object.fromEntries(
          updatedModels.map((model) => [
            model.id,
            detectModelLinkStatus(model),
          ]),
        ),
      }));
      setSelectedModelId(updatedModels[0]?.id ?? null);
    } catch {
      setFeedback({ tone: "error", key: "feedback.modelStateError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBatchDeleteModels() {
    const targets = selectedModels.filter((model) => !model.isActive);
    if (!targets.length || targets.length !== selectedModels.length) return;
    if (!window.confirm(`确认删除已选 ${targets.length} 个已停用模型？`))
      return;

    setSubmitting(true);
    resetFeedback();

    try {
      await Promise.all(targets.map((model) => deleteAiModel(model.id)));
      await reload(null);
      setSelectedModelIds(new Set());
      setFeedback({ tone: "success", key: "feedback.modelDeleted" });
    } catch {
      setFeedback({ tone: "error", key: "feedback.modelDeleteError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDetectLinks() {
    const targetIds = selectedModels.map((model) => model.id);
    if (!targetIds.length) return;

    setDetectingLinks(true);
    resetFeedback();
    setLinkStatusByModelId((current) => ({
      ...current,
      ...Object.fromEntries(
        targetIds.map((modelId) => [modelId, "checking" as const]),
      ),
    }));

    try {
      const [records] = await Promise.all([
        fetchAiModels(true),
        new Promise((resolve) =>
          window.setTimeout(resolve, LINK_CHECK_MIN_FEEDBACK_MS),
        ),
      ]);
      const targetIdSet = new Set(targetIds);
      setModels(records);
      setLinkStatusByModelId((current) => ({
        ...current,
        ...Object.fromEntries(
          records
            .filter((model) => targetIdSet.has(model.id))
            .map((model) => [model.id, detectModelLinkStatus(model)]),
        ),
      }));
    } catch {
      setFeedback({ tone: "error", key: "feedback.loadError" });
    } finally {
      setDetectingLinks(false);
    }
  }

  function toggleModelSelection(modelId: string, checked: boolean) {
    setSelectedModelIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(modelId);
      } else {
        next.delete(modelId);
      }
      return next;
    });
  }

  function togglePageSelection(checked: boolean) {
    setSelectedModelIds((current) => {
      const next = new Set(current);
      for (const modelId of pagedModelIds) {
        if (checked) {
          next.add(modelId);
        } else {
          next.delete(modelId);
        }
      }
      return next;
    });
  }

  // ── Provider 写路径 ────────────────────────────────────────────────────────

  async function reloadProviders() {
    setProviders(await fetchModelProviders(true));
  }

  function openCreateProviderDialog() {
    setProviderForm(defaultProviderForm());
    setProviderDialog({ mode: "create", id: null });
  }

  function openEditProviderDialog(provider: ModelProviderRecord) {
    setProviderForm(providerFormFromRecord(provider));
    setProviderDialog({ mode: "edit", id: provider.id });
  }

  async function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!providerDialog) return;

    const payload = {
      providerCode: providerForm.providerCode.trim(),
      providerName: providerForm.providerName.trim(),
      providerType: providerForm.providerType.trim() || "online",
      description: providerForm.description.trim() || null,
      logoUrl: providerForm.logoUrl.trim() || null,
      homepageUrl: providerForm.homepageUrl.trim() || null,
      consoleUrl: providerForm.consoleUrl.trim() || null,
      billingUrl: providerForm.billingUrl.trim() || null,
    };

    setCatalogBusy(true);
    try {
      if (providerDialog.mode === "create") {
        await createModelProvider(payload);
        toast({ tone: "success", title: "厂商已创建" });
      } else if (providerDialog.id) {
        await updateModelProvider(providerDialog.id, payload);
        toast({ tone: "success", title: "厂商已更新" });
      }
      await reloadProviders();
      setProviderDialog(null);
    } catch (error) {
      toast({ tone: "error", title: "保存失败", ...describeError(error) });
    } finally {
      setCatalogBusy(false);
    }
  }

  async function toggleProvider(
    provider: ModelProviderRecord,
    activate: boolean,
  ) {
    setCatalogBusy(true);
    try {
      await (activate
        ? activateModelProvider(provider.id)
        : deactivateModelProvider(provider.id));
      await reloadProviders();
      toast({
        tone: "success",
        title: activate ? "厂商已启用" : "厂商已停用",
      });
    } catch (error) {
      toast({ tone: "error", title: "操作失败", ...describeError(error) });
    } finally {
      setCatalogBusy(false);
    }
  }

  async function confirmDeleteProvider() {
    if (!pendingDeleteProvider) return;
    const target = pendingDeleteProvider;

    setCatalogBusy(true);
    try {
      await deleteModelProvider(target.id);
      await reloadProviders();
      setPendingDeleteProvider(null);
      toast({ tone: "success", title: "厂商已删除" });
    } catch (error) {
      toast({ tone: "error", title: "删除失败", ...describeError(error) });
    } finally {
      setCatalogBusy(false);
    }
  }

  // ── Price rule 写路径 ──────────────────────────────────────────────────────

  async function reloadPriceRules() {
    setPriceRules(await fetchModelPriceRules({ includeInactive: true }));
  }

  function openCreatePriceRuleDialog() {
    setPriceRuleForm(defaultPriceRuleForm(models[0]?.id ?? ""));
    setPriceRuleDialog({ mode: "create", id: null });
  }

  function openEditPriceRuleDialog(rule: ModelPriceRuleRecord) {
    setPriceRuleForm(priceRuleFormFromRecord(rule));
    setPriceRuleDialog({ mode: "edit", id: rule.id });
  }

  async function submitPriceRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceRuleDialog) return;

    const common: Partial<Omit<ModelPriceRuleWriteInput, "modelId">> = {
      billingMode: priceRuleForm.billingMode.trim() || "token",
      currency: priceRuleForm.currency.trim() || "CNY",
      inputUnitPrice: priceRuleForm.inputUnitPrice.trim() || "0",
      outputUnitPrice: priceRuleForm.outputUnitPrice.trim() || "0",
      requestUnitPrice: priceRuleForm.requestUnitPrice.trim() || "0",
      expiresAt: priceRuleForm.expiresAt || null,
    };
    const parsedUnitTokens = Number(priceRuleForm.unitTokens);
    if (Number.isFinite(parsedUnitTokens) && parsedUnitTokens > 0) {
      common.unitTokens = parsedUnitTokens;
    }
    if (priceRuleForm.effectiveAt) {
      common.effectiveAt = priceRuleForm.effectiveAt;
    }

    setCatalogBusy(true);
    try {
      if (priceRuleDialog.mode === "create") {
        if (!priceRuleForm.modelId) {
          toast({ tone: "error", title: "请先选择模型" });
          return;
        }
        await createModelPriceRule({
          modelId: priceRuleForm.modelId,
          ...common,
        });
        toast({ tone: "success", title: "计价规则已创建" });
      } else if (priceRuleDialog.id) {
        await updateModelPriceRule(priceRuleDialog.id, common);
        toast({ tone: "success", title: "计价规则已更新" });
      }
      await reloadPriceRules();
      setPriceRuleDialog(null);
    } catch (error) {
      toast({ tone: "error", title: "保存失败", ...describeError(error) });
    } finally {
      setCatalogBusy(false);
    }
  }

  async function togglePriceRule(
    rule: ModelPriceRuleRecord,
    activate: boolean,
  ) {
    setCatalogBusy(true);
    try {
      await (activate
        ? activateModelPriceRule(rule.id)
        : deactivateModelPriceRule(rule.id));
      await reloadPriceRules();
      toast({
        tone: "success",
        title: activate ? "规则已启用" : "规则已停用",
      });
    } catch (error) {
      toast({ tone: "error", title: "操作失败", ...describeError(error) });
    } finally {
      setCatalogBusy(false);
    }
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-model-platform-page">
      <PageHeader
        icon="code"
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        secondary={<Badge>{t("header.badge")}</Badge>}
      />

      {feedback ? (
        <p
          className={
            feedback.tone === "success"
              ? "vx-profile-message"
              : "vx-profile-error"
          }
        >
          {t(feedback.key, feedback.values)}
        </p>
      ) : null}

      <section
        className="vx-tenant-summary vx-model-platform-summary"
        aria-label={t("summary.ariaLabel")}
      >
        <ModelSummaryItem
          icon="plug"
          label={t("summary.models")}
          value={formatNumber(models.length)}
          tags={[
            `${t("filters.online")} ${formatNumber(onlineModels)}`,
            `${t("filters.private")} ${formatNumber(privateModels)}`,
          ]}
        />
        <ModelSummaryItem
          icon="play"
          label={t("filters.active")}
          value={formatNumber(activeModels)}
          tags={["可调度"]}
          tone={activeModels ? "green" : "amber"}
        />
        <ModelSummaryItem
          icon="code"
          label={t("status.inactive")}
          value={formatNumber(inactiveModels)}
          tags={inactiveModels ? ["需复核"] : ["无停用"]}
          tone={inactiveModels ? "amber" : "green"}
        />
        <ModelSummaryItem
          icon="settings"
          label="Provider"
          value={formatNumber(providers.length)}
          tags={[`启用 ${formatNumber(activeProviders.length)}`]}
          tone={activeProviders.length ? "green" : "amber"}
        />
        <ModelSummaryItem
          icon="database"
          label="策略 / 成本"
          value={`${formatNumber(activePolicies.length)} / ${formatNumber(activePriceRules.length)}`}
          tags={[
            `策略 ${formatNumber(policies.length)}`,
            `价格 ${formatNumber(priceRules.length)}`,
          ]}
          tone="blue"
        />
        <ModelSummaryItem
          icon="chart-bar"
          label="配额 / 用量"
          value={`${formatNumber(activeQuotas.length)} / ${formatNumber(totalUsageTokens)}`}
          tags={[
            `配额 ${formatNumber(quotas.length)}`,
            `汇总 ${formatNumber(usageSummaries.length)}`,
          ]}
          tone={usageSummaries.length ? "green" : "amber"}
        />
      </section>

      <div className="vx-tenant-list-shell">
        <section
          className="vx-tenant-toolbar"
          aria-label={t("table.filterAriaLabel")}
        >
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="模型展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredModels.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("table.searchPlaceholder")}
            className="vx-tenant-search"
            aria-label={t("table.searchAriaLabel")}
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-tenant-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ModelStatusFilter)
              }
              aria-label="模型状态"
            >
              {statusFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value as ModelSourceFilter)
              }
              aria-label="模型来源"
            >
              {sourceFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <ModelBatchOperationButtons
            canEnable={canBatchEnable}
            canDisable={canBatchDisable}
            canDelete={canBatchDelete}
            submitting={submitting}
            onEnable={() => void handleBatchEnableModels()}
            onDisable={() => void handleBatchDisableModels()}
            onDelete={() => void handleBatchDeleteModels()}
          />
          <ActionButton
            icon="shield-check"
            variant="outline"
            disabled={detectingLinks || selectedModels.length === 0}
            onClick={() => void handleDetectLinks()}
          >
            状态检测
          </ActionButton>
          <ActionButton icon="plus" onClick={openCreateModelDialog}>
            {t("actions.addModel")}
          </ActionButton>
        </section>

        <section
          className="vx-tenant-directory"
          aria-label={t("table.toolbarTitle", { count: filteredModels.length })}
        >
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>{t("empty.loadingTitle")}</span>
            </header>
          ) : null}

          {pagedModels.length && viewMode === "list" ? (
            <div
              className="vx-tenant-directory-list vx-model-platform-directory-list"
              role="region"
              aria-label={t("table.toolbarTitle", {
                count: filteredModels.length,
              })}
            >
              <div className="vx-tenant-directory-list__header">
                <span>
                  <Checkbox
                    className="vx-model-select-checkbox"
                    checked={
                      isPagePartiallySelected ? "indeterminate" : isPageSelected
                    }
                    onCheckedChange={(checked) =>
                      togglePageSelection(checked === true)
                    }
                    aria-label="选择当前页模型"
                  />
                </span>
                <span>序号</span>
                <span>{t("table.columns.model")}</span>
                <span>{t("table.columns.status")}</span>
                <span>链路状态</span>
                <span>来源</span>
                <span>模型能力</span>
                <span>操作</span>
              </div>
              {pagedModels.map((model, index) => (
                <div
                  key={model.id}
                  className={`vx-tenant-directory-row vx-model-platform-row vx-model-platform-row--${modelTone(model)} ${selectedModelIds.has(model.id) ? "vx-model-platform-row--selected" : ""}`}
                  title={`${model.modelName} · ${model.modelCode}`}
                  onClick={(event) => {
                    if (isInteractiveTarget(event.target)) return;
                    toggleModelSelection(
                      model.id,
                      !selectedModelIds.has(model.id),
                    );
                  }}
                >
                  <span className="vx-model-platform-row__select">
                    <Checkbox
                      className="vx-model-select-checkbox"
                      checked={selectedModelIds.has(model.id)}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={(checked) =>
                        toggleModelSelection(model.id, checked === true)
                      }
                      aria-label={`选择 ${model.modelName}`}
                    />
                  </span>
                  <span className="vx-tenant-directory-row__index">
                    {formatNumber(pageStart + index + 1)}
                  </span>
                  <span className="vx-tenant-directory-row__tenant">
                    <Icon
                      name={isPrivateProvider(model.provider) ? "code" : "plug"}
                      size={20}
                      fallback="placeholder"
                    />
                    <span>
                      <span className="vx-tenant-directory-row__title-line">
                        <Button
                          variant="link"
                          className="vx-model-name-button"
                          onClick={() => openEditModelDialog(model)}
                        >
                          {model.modelName}
                        </Button>
                      </span>
                      <small>{model.modelCode}</small>
                    </span>
                  </span>
                  <span className="vx-model-platform-row__status">
                    <span className="vx-tenant-directory-row__status-line">
                      <span
                        className={`vx-model-state-icon vx-model-state-icon--${model.isActive ? "active" : "inactive"}`}
                        role="img"
                        aria-label={
                          model.isActive
                            ? t("status.active")
                            : t("status.inactive")
                        }
                        title={
                          model.isActive
                            ? t("status.active")
                            : t("status.inactive")
                        }
                      >
                        <Icon
                          name={model.isActive ? "check" : "x"}
                          size="xs"
                          fallback="placeholder"
                        />
                      </span>
                      <Badge
                        className={`vx-tenant-pill vx-tenant-pill--${model.isActive ? "active" : "disabled"}`}
                      >
                        {model.isActive
                          ? t("status.active")
                          : t("status.inactive")}
                      </Badge>
                    </span>
                  </span>
                  <span className="vx-model-platform-row__link">
                    <Badge
                      className={`vx-tenant-pill vx-model-link-pill--${linkStatusByModelId[model.id] ?? detectModelLinkStatus(model)}`}
                    >
                      {(linkStatusByModelId[model.id] ??
                        detectModelLinkStatus(model)) === "checking"
                        ? "检测中"
                        : (linkStatusByModelId[model.id] ??
                              detectModelLinkStatus(model)) === "normal"
                          ? "正常"
                          : "异常"}
                    </Badge>
                  </span>
                  <span className="vx-model-platform-row__source">
                    <Badge
                      className={`vx-tenant-pill vx-model-provider-pill--${isPrivateProvider(model.provider) ? "private" : "online"}`}
                    >
                      {providerLabel(model.provider)}
                    </Badge>
                    <small>{model.protocol}</small>
                  </span>
                  <span className="vx-model-platform-row__capabilities">
                    <span className="vx-tenant-directory-row__tag-line">
                      {model.capabilities.slice(0, 3).map((capability) => (
                        <Badge
                          key={capability}
                          className="vx-tenant-pill vx-tenant-pill--permission"
                        >
                          {capability}
                        </Badge>
                      ))}
                      {model.capabilities.length > 3 ? (
                        <Badge className="vx-tenant-pill vx-tenant-pill--quota">
                          +{model.capabilities.length - 3}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <div
                    className="vx-tenant-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ActionMenu
                      label={t("actions.modelMenu", { name: model.modelName })}
                      triggerClassName="vx-tenant-actions__trigger"
                      triggerProps={{
                        title: t("actions.modelMenu", {
                          name: model.modelName,
                        }),
                      }}
                      items={[
                        {
                          id: "edit",
                          label: t("actions.editModel"),
                          icon: (
                            <Icon
                              name="edit"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          onSelect: () => openEditModelDialog(model),
                        },
                        {
                          id: "enable",
                          label: t("actions.enableModel"),
                          icon: (
                            <Icon
                              name="play"
                              size={16}
                              weight="fill"
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting || model.isActive,
                          onSelect: () => void handleToggleModel(model),
                        },
                        {
                          id: "disable",
                          label: t("actions.disableModel"),
                          icon: (
                            <Icon
                              name="stop"
                              size={16}
                              weight="fill"
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting || !model.isActive,
                          onSelect: () => void handleToggleModel(model),
                        },
                        {
                          id: "delete",
                          label: t("actions.deleteModel"),
                          icon: (
                            <Icon
                              name="trash"
                              size={16}
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting || model.isActive,
                          danger: true,
                          onSelect: () => void handleDeleteModel(model),
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : pagedModels.length ? (
            <div
              className="vx-tenant-directory-cards vx-model-platform-cards"
              aria-label={t("table.toolbarTitle", {
                count: filteredModels.length,
              })}
            >
              {pagedModels.map((model) => (
                <article
                  key={model.id}
                  className={`vx-tenant-directory-card vx-model-platform-card vx-model-platform-card--${modelTone(model)}`}
                >
                  <header>
                    <Icon
                      name={isPrivateProvider(model.provider) ? "code" : "plug"}
                      size={24}
                      fallback="placeholder"
                    />
                    <div>
                      <Button
                        variant="link"
                        className="vx-model-name-button"
                        onClick={() => openEditModelDialog(model)}
                      >
                        {model.modelName}
                      </Button>
                      <span>{model.modelCode}</span>
                    </div>
                    <ModelOperationButtons
                      model={model}
                      submitting={submitting}
                      onEnable={(target) => void handleToggleModel(target)}
                      onDisable={(target) => void handleToggleModel(target)}
                      onDelete={(target) => void handleDeleteModel(target)}
                    />
                  </header>
                  <div className="vx-tenant-directory-card__badges">
                    <Badge
                      className={`vx-tenant-pill vx-model-provider-pill--${isPrivateProvider(model.provider) ? "private" : "online"}`}
                    >
                      {providerLabel(model.provider)}
                    </Badge>
                    <Badge
                      className={`vx-tenant-pill vx-tenant-pill--${model.isActive ? "active" : "disabled"}`}
                    >
                      {model.isActive
                        ? t("status.active")
                        : t("status.inactive")}
                    </Badge>
                  </div>
                  <div className="vx-tenant-directory-card__metrics">
                    <span>
                      <b>{model.capabilities.length}</b>
                      <small>{t("table.columns.capabilities")}</small>
                    </span>
                    <span>
                      <b>
                        {isPrivateProvider(model.provider)
                          ? t("filters.private")
                          : t("filters.online")}
                      </b>
                      <small>{t("table.columns.provider")}</small>
                    </span>
                    <span>
                      <b>{model.protocol}</b>
                      <small>{t("dialogs.fields.protocol")}</small>
                    </span>
                  </div>
                  <footer>
                    <span>
                      {model.capabilities.slice(0, 2).join(", ") || "-"}
                    </span>
                    <strong>{model.keyReference?.name || "-"}</strong>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={loading ? t("empty.loadingTitle") : t("empty.title")}
                description={
                  loading
                    ? t("empty.loadingDescription")
                    : t("empty.description")
                }
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={handleReset}
                  >
                    {t("empty.resetFilters")}
                  </ActionButton>
                }
              />
            </section>
          )}

          <footer className="vx-tenant-pagination">
            <span className="vx-tenant-pagination__total">
              {t("pagination.summary", {
                page: safeCurrentPage,
                totalPages,
                total: filteredModels.length,
              })}
            </span>
            <div className="vx-tenant-pagination__actions">
              <AdminPageSizePicker
                value={pageSize}
                onChange={setPageSize}
                activeVariant="ghost"
                inactiveVariant="ghost"
                aria-label="page size"
                optionAriaLabel={(option) => `Page size ${option}`}
              />
              <Pagination
                className="vx-tenant-pagination__pager"
                page={safeCurrentPage}
                pageCount={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </footer>
        </section>
      </div>

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="模型厂商管理">
          <strong>模型厂商</strong>
          <span className="vx-tenant-view-count">
            {formatNumber(providers.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <ActionButton icon="plus" onClick={openCreateProviderDialog}>
            新建厂商
          </ActionButton>
        </section>
        <section className="vx-tenant-directory" aria-label="模型厂商列表">
          {providers.length ? (
            <div className="vx-tenant-directory-cards vx-model-platform-cards">
              {providers.map((provider) => (
                <article
                  key={provider.id}
                  className={`vx-tenant-directory-card vx-model-platform-card vx-model-platform-card--${provider.isActive ? "active" : "muted"}`}
                >
                  <header>
                    <Icon name="settings" size={24} fallback="placeholder" />
                    <div>
                      <Button
                        variant="link"
                        className="vx-model-name-button"
                        onClick={() => openEditProviderDialog(provider)}
                      >
                        {provider.providerName}
                      </Button>
                      <span>{provider.providerCode}</span>
                    </div>
                    <ActionMenu
                      label={`${provider.providerName} 操作`}
                      triggerClassName="vx-tenant-actions__trigger"
                      triggerProps={{ title: `${provider.providerName} 操作` }}
                      items={[
                        {
                          id: "edit",
                          label: "编辑",
                          icon: (
                            <Icon
                              name="edit"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          onSelect: () => openEditProviderDialog(provider),
                        },
                        {
                          id: "enable",
                          label: "启用",
                          icon: (
                            <Icon
                              name="play"
                              size={16}
                              weight="fill"
                              fallback="placeholder"
                            />
                          ),
                          disabled: catalogBusy || provider.isActive,
                          onSelect: () => void toggleProvider(provider, true),
                        },
                        {
                          id: "disable",
                          label: "停用",
                          icon: (
                            <Icon
                              name="stop"
                              size={16}
                              weight="fill"
                              fallback="placeholder"
                            />
                          ),
                          disabled: catalogBusy || !provider.isActive,
                          onSelect: () => void toggleProvider(provider, false),
                        },
                        {
                          id: "delete",
                          label: "删除",
                          icon: (
                            <Icon
                              name="trash"
                              size={16}
                              fallback="placeholder"
                            />
                          ),
                          disabled: catalogBusy || provider.isActive,
                          danger: true,
                          onSelect: () => setPendingDeleteProvider(provider),
                        },
                      ]}
                    />
                  </header>
                  <div className="vx-tenant-directory-card__badges">
                    <Badge className="vx-tenant-pill vx-tenant-pill--permission">
                      {provider.providerType}
                    </Badge>
                    <Badge
                      className={`vx-tenant-pill vx-tenant-pill--${provider.isActive ? "active" : "disabled"}`}
                    >
                      {provider.isActive
                        ? t("status.active")
                        : t("status.inactive")}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title="暂无厂商"
                description="点击「新建厂商」添加模型厂商。"
              />
            </section>
          )}
        </section>
      </div>

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="计价规则管理">
          <strong>计价规则</strong>
          <span className="vx-tenant-view-count">
            {formatNumber(priceRules.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <ActionButton
            icon="plus"
            disabled={models.length === 0}
            onClick={openCreatePriceRuleDialog}
          >
            新建规则
          </ActionButton>
        </section>
        <section className="vx-tenant-directory" aria-label="计价规则列表">
          {priceRules.length ? (
            <div className="vx-tenant-directory-cards vx-model-platform-cards">
              {priceRules.map((rule) => {
                const ruleModel = modelById.get(rule.modelId);
                return (
                  <article
                    key={rule.id}
                    className={`vx-tenant-directory-card vx-model-platform-card vx-model-platform-card--${rule.isActive ? "active" : "muted"}`}
                  >
                    <header>
                      <Icon name="database" size={24} fallback="placeholder" />
                      <div>
                        <Button
                          variant="link"
                          className="vx-model-name-button"
                          onClick={() => openEditPriceRuleDialog(rule)}
                        >
                          {ruleModel?.modelName ?? rule.modelId}
                        </Button>
                        <span>
                          {rule.billingMode} · {rule.currency}
                        </span>
                      </div>
                      <ActionMenu
                        label={`${ruleModel?.modelName ?? rule.modelId} 计价规则操作`}
                        triggerClassName="vx-tenant-actions__trigger"
                        triggerProps={{ title: "计价规则操作" }}
                        items={[
                          {
                            id: "edit",
                            label: "编辑",
                            icon: (
                              <Icon
                                name="edit"
                                size="xs"
                                fallback="placeholder"
                              />
                            ),
                            onSelect: () => openEditPriceRuleDialog(rule),
                          },
                          {
                            id: "enable",
                            label: "启用",
                            icon: (
                              <Icon
                                name="play"
                                size={16}
                                weight="fill"
                                fallback="placeholder"
                              />
                            ),
                            disabled: catalogBusy || rule.isActive,
                            onSelect: () => void togglePriceRule(rule, true),
                          },
                          {
                            id: "disable",
                            label: "停用",
                            icon: (
                              <Icon
                                name="stop"
                                size={16}
                                weight="fill"
                                fallback="placeholder"
                              />
                            ),
                            disabled: catalogBusy || !rule.isActive,
                            onSelect: () => void togglePriceRule(rule, false),
                          },
                        ]}
                      />
                    </header>
                    <div className="vx-tenant-directory-card__badges">
                      <Badge className="vx-tenant-pill vx-tenant-pill--permission">
                        {rule.currency}
                      </Badge>
                      <Badge
                        className={`vx-tenant-pill vx-tenant-pill--${rule.isActive ? "active" : "disabled"}`}
                      >
                        {rule.isActive
                          ? t("status.active")
                          : t("status.inactive")}
                      </Badge>
                    </div>
                    <div className="vx-tenant-directory-card__metrics">
                      <span>
                        <b>{rule.inputUnitPrice}</b>
                        <small>输入单价</small>
                      </span>
                      <span>
                        <b>{rule.outputUnitPrice}</b>
                        <small>输出单价</small>
                      </span>
                      <span>
                        <b>{formatNumber(rule.unitTokens)}</b>
                        <small>计价单位</small>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title="暂无计价规则"
                description="点击「新建规则」为模型配置计价。"
              />
            </section>
          )}
        </section>
      </div>

      {dialogMode === "createModel" || dialogMode === "editModel" ? (
        <DialogForm
          open
          title={t(`dialogs.${dialogMode}.title`)}
          submitLabel={t("dialogs.actions.save")}
          cancelLabel={t("dialogs.actions.cancel")}
          submitting={submitting}
          contentClassName="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) setDialogMode(null);
          }}
          onSubmit={(event) => void submitModel(event)}
        >
          <div className="vx-model-dialog__grid">
            <Label>
              {t("dialogs.fields.modelName")}
              <Input
                value={modelForm.modelName}
                onChange={(event) =>
                  setModelForm((old) => ({
                    ...old,
                    modelName: event.target.value,
                  }))
                }
                required
              />
            </Label>
            <Label>
              {t("dialogs.fields.modelCode")}
              <Input
                value={modelForm.modelCode}
                onChange={(event) =>
                  setModelForm((old) => ({
                    ...old,
                    modelCode: event.target.value,
                  }))
                }
                required
              />
            </Label>
            <Label>
              {t("dialogs.fields.provider")}
              <NativeSelect
                value={modelForm.provider}
                onChange={(event) =>
                  setModelForm((old) => ({
                    ...old,
                    provider: event.target.value,
                  }))
                }
              >
                {PROVIDER_OPTIONS.map((provider) => (
                  <option key={provider} value={provider}>
                    {providerLabel(provider)}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label>
              {t("dialogs.fields.protocol")}
              <NativeSelect
                value={modelForm.protocol}
                onChange={(event) =>
                  setModelForm((old) => ({
                    ...old,
                    protocol: event.target.value,
                  }))
                }
              >
                {PROTOCOL_OPTIONS.map((protocol) => (
                  <option key={protocol} value={protocol}>
                    {protocol}
                  </option>
                ))}
              </NativeSelect>
            </Label>
          </div>
          <Label>
            {t("dialogs.fields.endpointUrl")}
            <Input
              value={modelForm.endpointUrl}
              onChange={(event) =>
                setModelForm((old) => ({
                  ...old,
                  endpointUrl: event.target.value,
                }))
              }
              required
            />
          </Label>
          <div className="vx-model-dialog__grid">
            <Label>
              {t("dialogs.fields.keyReference")}
              <Input
                value={modelForm.keyReferenceName}
                onChange={(event) =>
                  setModelForm((old) => ({
                    ...old,
                    keyReferenceName: event.target.value,
                  }))
                }
                required
              />
            </Label>
            <Label>
              {t("dialogs.fields.capabilities")}
              <Input
                value={modelForm.capabilities}
                onChange={(event) =>
                  setModelForm((old) => ({
                    ...old,
                    capabilities: event.target.value,
                  }))
                }
                required
              />
            </Label>
          </div>
          <Label>
            {t("dialogs.fields.config")}
            <Textarea
              className="vx-input vx-model-dialog__textarea"
              value={modelForm.configText}
              onChange={(event) =>
                setModelForm((old) => ({
                  ...old,
                  configText: event.target.value,
                }))
              }
              placeholder='{"anthropicVersion":"2023-06-01"}'
            />
          </Label>
        </DialogForm>
      ) : null}

      {providerDialog ? (
        <DialogForm
          open
          title={providerDialog.mode === "create" ? "新建厂商" : "编辑厂商"}
          submitLabel={t("dialogs.actions.save")}
          cancelLabel={t("dialogs.actions.cancel")}
          submitting={catalogBusy}
          contentClassName="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) setProviderDialog(null);
          }}
          onSubmit={(event) => void submitProvider(event)}
        >
          <div className="vx-model-dialog__grid">
            <Label>
              厂商名称
              <Input
                value={providerForm.providerName}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    providerName: event.target.value,
                  }))
                }
                required
              />
            </Label>
            <Label>
              厂商编码
              <Input
                value={providerForm.providerCode}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    providerCode: event.target.value,
                  }))
                }
                required
              />
            </Label>
            <Label>
              厂商类型
              <Input
                value={providerForm.providerType}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    providerType: event.target.value,
                  }))
                }
                placeholder="online"
              />
            </Label>
            <Label>
              Logo URL
              <Input
                value={providerForm.logoUrl}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    logoUrl: event.target.value,
                  }))
                }
              />
            </Label>
          </div>
          <Label>
            厂商简介
            <Textarea
              className="vx-input vx-model-dialog__textarea"
              value={providerForm.description}
              onChange={(event) =>
                setProviderForm((old) => ({
                  ...old,
                  description: event.target.value,
                }))
              }
            />
          </Label>
          <div className="vx-model-dialog__grid">
            <Label>
              主页 URL
              <Input
                value={providerForm.homepageUrl}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    homepageUrl: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              控制台 URL
              <Input
                value={providerForm.consoleUrl}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    consoleUrl: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              计费页 URL
              <Input
                value={providerForm.billingUrl}
                onChange={(event) =>
                  setProviderForm((old) => ({
                    ...old,
                    billingUrl: event.target.value,
                  }))
                }
              />
            </Label>
          </div>
        </DialogForm>
      ) : null}

      {priceRuleDialog ? (
        <DialogForm
          open
          title={
            priceRuleDialog.mode === "create" ? "新建计价规则" : "编辑计价规则"
          }
          submitLabel={t("dialogs.actions.save")}
          cancelLabel={t("dialogs.actions.cancel")}
          submitting={catalogBusy}
          contentClassName="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) setPriceRuleDialog(null);
          }}
          onSubmit={(event) => void submitPriceRule(event)}
        >
          <div className="vx-model-dialog__grid">
            <Label>
              模型
              <NativeSelect
                value={priceRuleForm.modelId}
                disabled={priceRuleDialog.mode === "edit"}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    modelId: event.target.value,
                  }))
                }
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.modelName}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label>
              计费模式
              <Input
                value={priceRuleForm.billingMode}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    billingMode: event.target.value,
                  }))
                }
                placeholder="token"
              />
            </Label>
            <Label>
              币种
              <Input
                value={priceRuleForm.currency}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    currency: event.target.value,
                  }))
                }
                placeholder="CNY"
              />
            </Label>
            <Label>
              计价单位（tokens）
              <Input
                type="number"
                min={1}
                value={priceRuleForm.unitTokens}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    unitTokens: event.target.value,
                  }))
                }
              />
            </Label>
          </div>
          <div className="vx-model-dialog__grid">
            <Label>
              输入单价
              <Input
                value={priceRuleForm.inputUnitPrice}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    inputUnitPrice: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </Label>
            <Label>
              输出单价
              <Input
                value={priceRuleForm.outputUnitPrice}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    outputUnitPrice: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </Label>
            <Label>
              请求单价
              <Input
                value={priceRuleForm.requestUnitPrice}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    requestUnitPrice: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </Label>
          </div>
          <div className="vx-model-dialog__grid">
            <Label>
              生效时间
              <Input
                type="datetime-local"
                value={priceRuleForm.effectiveAt}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    effectiveAt: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              失效时间（可选）
              <Input
                type="datetime-local"
                value={priceRuleForm.expiresAt}
                onChange={(event) =>
                  setPriceRuleForm((old) => ({
                    ...old,
                    expiresAt: event.target.value,
                  }))
                }
              />
            </Label>
          </div>
        </DialogForm>
      ) : null}

      {pendingDeleteProvider ? (
        <DialogForm
          open
          title="删除厂商"
          description={`确认删除「${pendingDeleteProvider.providerName}」？此操作不可撤销。`}
          submitLabel="删除"
          submitVariant="destructive"
          submitting={catalogBusy}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteProvider(null);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void confirmDeleteProvider();
          }}
        />
      ) : null}
    </div>
  );
}
