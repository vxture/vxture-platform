"use client";

/**
 * OrderPayPage.tsx - 订单付款页（product_321 §6.1）。
 * @package @vxture/console
 * @layer Application
 * @category Module
 *
 * 同一路由按六态切换渲染：待付款（金额分解 + 券勾选 + 支付方式 + 申报）/
 * 已付款·待确认（轮询 + 手动刷新）/ 开通处理中（轮询）/ 终态视图。
 * 勾选变化调 quote 纯试算；「我已完成付款」弹 DS Dialog 确认后 declare。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Badge,
  Button,
  Checkbox,
  DialogForm,
  Input,
  Label,
  PageHeader,
  Skeleton,
} from "@vxture/design-system";
import {
  ConsoleBffError,
  declareOrderPayment,
  fetchOrderDetail,
  quoteOrder,
  cancelSubscriptionOrder,
  type OrderDetail,
  type OrderQuote,
  type OrderVoucherOption,
  type PaymentChannelInfo,
} from "@/api/console-bff";

const POLL_MS = 15_000;

type PayChannel = "alipay" | "bank_transfer";

function fmt(amount: string, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return `${currency === "CNY" ? "¥" : currency} ${n.toFixed(2)}`;
}

function useCountdown(deadline: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const remain = new Date(deadline).getTime() - now;
  if (remain <= 0) return "00:00";
  const m = Math.floor(remain / 60_000);
  const s = Math.floor((remain % 60_000) / 1_000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function voucherLabel(
  v: OrderVoucherOption,
  t: ReturnType<typeof useTranslations>,
): string {
  if (v.kind === "discount") {
    const off =
      v.discountType === "percent"
        ? t("voucher.percentOff", { value: v.discountValue ?? 0 })
        : // fixed effect value is integer cents (230 §4) — display in yuan
          t("voucher.fixedOff", {
            value: ((v.discountValue ?? 0) / 100).toFixed(2),
          });
    return `${v.batchName} · ${off}`;
  }
  return `${v.batchName} · ¥${v.amount ?? "0"}`;
}

export function OrderPayPage() {
  const t = useTranslations("orderPay");
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ?? "";

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [discountId, setDiscountId] = useState<string | null>(null);
  const [creditId, setCreditId] = useState<string | null>(null);
  const [channel, setChannel] = useState<PayChannel>("alipay");
  const [declareOpen, setDeclareOpen] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const defaultsApplied = useRef(false);

  const reload = useCallback(async () => {
    if (inFlight.current || !orderId) return;
    inFlight.current = true;
    try {
      const next = await fetchOrderDetail(orderId);
      setDetail(next);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Default channel = first enabled; default discount voucher = best (P5:
  // 默认勾选最优折扣券 — the list is server-sorted; pick the first discount).
  useEffect(() => {
    if (!detail || defaultsApplied.current) return;
    defaultsApplied.current = true;
    const firstEnabled = detail.paymentChannels.find(
      (c): c is PaymentChannelInfo & { channel: PayChannel } =>
        c.enabled && (c.channel === "alipay" || c.channel === "bank_transfer"),
    );
    if (firstEnabled) setChannel(firstEnabled.channel);
    const bestDiscount = detail.vouchers.find((v) => v.kind === "discount");
    if (bestDiscount) setDiscountId(bestDiscount.voucherId);
  }, [detail]);

  // Quote re-run on any voucher selection change (pending state only).
  useEffect(() => {
    if (!detail || detail.orderState !== "pending_payment") return;
    let cancelled = false;
    quoteOrder(detail.orderId, {
      ...(discountId ? { discountVoucherId: discountId } : {}),
      ...(creditId ? { creditVoucherId: creditId } : {}),
    })
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("errors.quote"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [detail, discountId, creditId, t]);

  // Poll while awaiting confirmation / activation (ConsoleSessionProvider
  // pattern: interval + focus/visibility triggers + in-flight dedupe).
  const polling =
    detail?.orderState === "paid_pending_verify" ||
    detail?.orderState === "activating";
  useEffect(() => {
    if (!polling) return;
    const tick = () => void reload();
    const timer = window.setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [polling, reload]);

  const countdown = useCountdown(
    detail?.orderState === "pending_payment" ? detail.expireAt : null,
  );

  const discountVouchers = useMemo(
    () => detail?.vouchers.filter((v) => v.kind === "discount") ?? [],
    [detail],
  );
  const creditVouchers = useMemo(
    () => detail?.vouchers.filter((v) => v.kind === "credit_voucher") ?? [],
    [detail],
  );
  const activeChannel = detail?.paymentChannels.find(
    (c) => c.channel === channel,
  );
  const cashDue = quote?.cashDue ?? detail?.listPrice ?? "0";

  async function handleDeclare() {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await declareOrderPayment(detail.orderId, {
        payChannel: channel,
        ...(discountId ? { discountVoucherId: discountId } : {}),
        ...(creditId ? { creditVoucherId: creditId } : {}),
        ...(payerName.trim() ? { payerName: payerName.trim() } : {}),
        ...(transactionNo.trim()
          ? { transactionNo: transactionNo.trim() }
          : {}),
      });
      setDeclareOpen(false);
      if (result.outcome === "activated") {
        router.replace("/subscription");
        return;
      }
      await reload();
    } catch (err) {
      setError(
        err instanceof ConsoleBffError ? err.message : t("errors.declare"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    try {
      await cancelSubscriptionOrder(detail.orderId);
      router.replace("/subscription");
    } catch (err) {
      setError(
        err instanceof ConsoleBffError ? err.message : t("errors.cancel"),
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="vx-page-stack">
        <PageHeader icon="table" title={t("title")} description="" />
        <Skeleton />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="vx-page-stack">
        <PageHeader
          icon="table"
          title={t("title")}
          description={t("notFound")}
          action={
            <Button
              variant="outline"
              onClick={() => router.push("/subscription")}
            >
              {t("actions.backToSubscription")}
            </Button>
          }
        />
      </div>
    );
  }

  const isPending = detail.orderState === "pending_payment";
  const fullVoucherCover = isPending && Number(cashDue) === 0;

  return (
    <div className="vx-page-stack">
      <PageHeader
        icon="table"
        title={t("title")}
        description={`${detail.orderNo} · ${t(`status.${detail.orderState}`)}`}
        action={
          countdown ? (
            <span className="vx-order-pay-countdown">
              {t("countdown", { time: countdown })}
            </span>
          ) : undefined
        }
      />

      {detail.rejectReason && isPending ? (
        <div className="vx-order-pay-reject-banner" role="alert">
          {t("rejectBanner", { reason: detail.rejectReason })}
        </div>
      ) : null}

      {isPending ? (
        <div className="vx-order-pay-grid">
          {/* 左栏：订单 + 金额分解 */}
          <div className="vx-page-stack">
            <section className="vx-order-pay-card">
              <strong>
                {detail.planName || detail.planCode}
                {detail.tier ? ` · ${detail.tier}` : ""}
              </strong>
              <span className="vx-order-pay-muted">
                {t(`cycle.${detail.cycleUnit}` as never)} ·{" "}
                {t("cycleStartNote")}
              </span>
            </section>

            <section className="vx-order-pay-card vx-order-pay-card--accent">
              <strong>{t("breakdown.title")}</strong>
              <div className="vx-order-pay-row">
                <span className="vx-order-pay-row__label">
                  {t("breakdown.listPrice")}
                </span>
                <span>
                  {fmt(quote?.listPrice ?? detail.listPrice, detail.currency)}
                </span>
              </div>

              <div className="vx-order-pay-row">
                <span className="vx-order-pay-row__label">
                  {discountVouchers.length > 0 ? (
                    <>
                      <Checkbox
                        id="order-pay-discount"
                        checked={Boolean(discountId)}
                        onCheckedChange={(checked) =>
                          setDiscountId(
                            checked === true
                              ? (discountVouchers[0]?.voucherId ?? null)
                              : null,
                          )
                        }
                      />
                      <Label htmlFor="order-pay-discount">
                        {t("breakdown.discountVoucher")}
                        {discountId && discountVouchers[0]
                          ? ` · ${voucherLabel(discountVouchers[0], t)}`
                          : ""}
                      </Label>
                    </>
                  ) : (
                    <span className="vx-order-pay-muted">
                      {t("breakdown.noDiscountVoucher")}
                    </span>
                  )}
                </span>
                <span className="vx-order-pay-row__save">
                  {quote && Number(quote.discountOff) > 0
                    ? `− ${fmt(quote.discountOff, detail.currency)}`
                    : "—"}
                </span>
              </div>

              <div className="vx-order-pay-row">
                <span className="vx-order-pay-row__label">
                  {creditVouchers.length > 0 ? (
                    <>
                      <Checkbox
                        id="order-pay-credit"
                        checked={Boolean(creditId)}
                        onCheckedChange={(checked) =>
                          setCreditId(
                            checked === true
                              ? (creditVouchers[0]?.voucherId ?? null)
                              : null,
                          )
                        }
                      />
                      <Label htmlFor="order-pay-credit">
                        {t("breakdown.creditVoucher")}
                        {creditId && creditVouchers[0]
                          ? ` · ${voucherLabel(creditVouchers[0], t)}`
                          : ""}
                      </Label>
                    </>
                  ) : (
                    <span className="vx-order-pay-muted">
                      {t("breakdown.noCreditVoucher")}
                    </span>
                  )}
                </span>
                <span className="vx-order-pay-row__save">
                  {quote && Number(quote.voucherOff) > 0
                    ? `− ${fmt(quote.voucherOff, detail.currency)}`
                    : "—"}
                </span>
              </div>

              {Number(detail.paidAmount) > 0 ? (
                <div className="vx-order-pay-row">
                  <span className="vx-order-pay-row__label">
                    {t("breakdown.alreadyPaid")}
                  </span>
                  <span className="vx-order-pay-row__save">
                    − {fmt(detail.paidAmount, detail.currency)}
                  </span>
                </div>
              ) : null}

              <div className="vx-order-pay-sum">
                <strong>{t("breakdown.cashDue")}</strong>
                <span className="vx-order-pay-sum__due">
                  {fmt(cashDue, detail.currency)}
                </span>
              </div>
            </section>
          </div>

          {/* 右栏：支付方式 + 操作 */}
          <div className="vx-page-stack">
            <section className="vx-order-pay-card">
              <strong>{t("channels.title")}</strong>
              <div className="vx-order-pay-tabs" role="group">
                {detail.paymentChannels.map((c) => (
                  <Button
                    key={c.channel}
                    type="button"
                    variant="ghost"
                    className="vx-order-pay-tab"
                    aria-pressed={channel === c.channel}
                    disabled={!c.enabled}
                    onClick={() => {
                      if (
                        c.channel === "alipay" ||
                        c.channel === "bank_transfer"
                      )
                        setChannel(c.channel);
                    }}
                  >
                    {t(`channels.${c.channel}`)}
                    {!c.enabled ? ` · ${t("channels.comingSoon")}` : ""}
                  </Button>
                ))}
              </div>

              {channel === "alipay" && activeChannel?.qrAsset ? (
                <div className="vx-order-pay-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeChannel.qrAsset}
                    alt={t("channels.alipayQrAlt")}
                  />
                </div>
              ) : null}

              {channel === "bank_transfer" && activeChannel?.account ? (
                <div className="vx-page-stack">
                  <div className="vx-order-pay-row">
                    <span className="vx-order-pay-muted">
                      {t("bank.accountName")}
                    </span>
                    <strong>{activeChannel.account.accountName}</strong>
                  </div>
                  <div className="vx-order-pay-row">
                    <span className="vx-order-pay-muted">
                      {t("bank.bankName")}
                    </span>
                    <strong>{activeChannel.account.bankName}</strong>
                  </div>
                  <div className="vx-order-pay-row">
                    <span className="vx-order-pay-muted">
                      {t("bank.accountNo")}
                    </span>
                    <strong>{activeChannel.account.accountNo}</strong>
                  </div>
                </div>
              ) : null}

              {detail.paymentChannels.every((c) => !c.enabled) ? (
                <span className="vx-order-pay-muted">
                  {t("channels.noneEnabled")}
                </span>
              ) : (
                <span className="vx-order-pay-muted">
                  {t("referenceNote", { orderNo: detail.orderNo })}
                </span>
              )}
            </section>

            {error ? (
              <div className="vx-order-pay-reject-banner" role="alert">
                {error}
              </div>
            ) : null}

            <div className="vx-order-pay-actions">
              <Button
                onClick={() => {
                  setError(null);
                  setDeclareOpen(true);
                }}
                disabled={submitting || !quote}
              >
                {fullVoucherCover
                  ? t("actions.settleInstant")
                  : t("actions.declarePaid")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleCancel()}
                disabled={submitting || Number(detail.paidAmount) > 0}
              >
                {t("actions.cancelOrder")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <section className="vx-order-pay-card">
          <div className="vx-order-pay-state">
            <Badge>{t(`status.${detail.orderState}`)}</Badge>
            <strong>{t(`stateTitle.${detail.orderState}`)}</strong>
            <span className="vx-order-pay-muted">
              {t(`stateHint.${detail.orderState}`)}
            </span>
            <div className="vx-order-pay-actions">
              <Button variant="outline" onClick={() => void reload()}>
                {t("actions.refresh")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/subscription")}
              >
                {t("actions.backToSubscription")}
              </Button>
            </div>
          </div>
        </section>
      )}

      {declareOpen && detail ? (
        <DialogForm
          open
          title={
            fullVoucherCover
              ? t("declareDialog.titleInstant")
              : t("declareDialog.title")
          }
          description={t("declareDialog.description", {
            amount: fmt(cashDue, detail.currency),
            channel: t(`channels.${channel}`),
          })}
          submitLabel={
            fullVoucherCover
              ? t("actions.settleInstant")
              : t("declareDialog.confirm")
          }
          cancelLabel={t("declareDialog.cancel")}
          submitting={submitting}
          onOpenChange={(open: boolean) => {
            if (!open && !submitting) setDeclareOpen(false);
          }}
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            void handleDeclare();
          }}
        >
          {!fullVoucherCover ? (
            <>
              <Label htmlFor="order-pay-payer">
                {t("declareDialog.payerName")}
              </Label>
              <Input
                id="order-pay-payer"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder={t("declareDialog.payerPlaceholder")}
              />
              <Label htmlFor="order-pay-txn">
                {t("declareDialog.transactionNo")}
              </Label>
              <Input
                id="order-pay-txn"
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
                placeholder={t("declareDialog.optional")}
              />
            </>
          ) : null}
          {error ? (
            <div className="vx-order-pay-reject-banner" role="alert">
              {error}
            </div>
          ) : null}
        </DialogForm>
      ) : null}
    </div>
  );
}
