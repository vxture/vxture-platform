/**
 * provisioning.types.ts - provisioning dispatcher contracts (P4)
 * @package @vxture/service-provisioning
 *
 * See docs/design/identity-platform-rp-integration.md for the wire
 * contract these types implement (payload, signature, idempotency, ordering).
 */

/** Webhook event kinds that drive the provisioning state machine. */
export type ProvisioningEventType =
  | "tenant.provisioned"
  | "tenant.deprovisioned";

/**
 * All event kinds carried by provisioning.webhook_deliveries. The two
 * lifecycle kinds bump provisionings.version (seq); the invalidate kinds are
 * version-less notifications riding the same queue (data_commerce_220 §2 left
 * provisioning_id/version NULL-able for exactly this): subscription_changed =
 * C2 entitlement cache-bust (product_200 §4.2, closes the P2.4 downgrade
 * debt), grant.invalidated = sharing grant revoked/expired (data_sharing_200 §4).
 */
export type DeliveryEventType =
  | ProvisioningEventType
  | "subscription_changed"
  | "grant.invalidated";

/** The signed JSON body POSTed to the app's webhook_url. */
export interface ProvisioningPayload {
  /** = webhook_deliveries.id; the app's idempotency key. */
  id: string;
  type: ProvisioningEventType;
  /** epoch seconds */
  occurred_at: number;
  /** = provisionings.version; monotonic per (workspace, product). */
  seq: number;
  /** = provisionings.workspace_id; the provisioned subject. */
  workspace_id: string;
  tenant_id: string;
  /** = products.product_code */
  application: string;
  /** present on provisioned; may be null on deprovisioned */
  plan?: string | null;
  /** forward-compat extension slot */
  data: Record<string, unknown>;
}

/** The signed JSON body of a version-less notification event (no seq). */
export interface GenericEventPayload {
  /** = webhook_deliveries.id; the app's idempotency key. */
  id: string;
  type: Exclude<DeliveryEventType, ProvisioningEventType>;
  /** epoch seconds */
  occurred_at: number;
  workspace_id: string;
  tenant_id: string;
  /** = products.product_code (the receiving product) */
  application: string;
  /** event-specific body (products list / grant descriptor …) */
  data: Record<string, unknown>;
}

/** Input to enqueue a version-less notification event. */
export interface EnqueueEventInput {
  workspaceId: string;
  tenantId: string;
  /** product.products.id of the receiving product. */
  applicationId: string;
  /** products.product_code (carried into the payload). */
  appCode: string;
  event: Exclude<DeliveryEventType, ProvisioningEventType>;
  /**
   * Caller-derived deterministic key. Version-less events do not get seq
   * uniqueness, so the key MUST embed an event-instance discriminator
   * (data_commerce_220 §2), e.g. `${grantId}:grant.invalidated:revoked`.
   */
  idempotencyKey: string;
  data: Record<string, unknown>;
  /** epoch seconds; defaults to now. */
  occurredAt?: number;
}

/** Input to enqueue a provisioning event (called by the commerce lifecycle). */
export interface EnqueueProvisioningInput {
  /** provisionings.workspace_id — the provisioned subject (UNIQUE per product). */
  workspaceId: string;
  tenantId: string;
  /** provisionings.product_id (a product.products id). */
  applicationId: string;
  /** products.product_code (carried into the payload). */
  appCode: string;
  event: ProvisioningEventType;
  /** plan_id (uuid) stored on the provisioning row; informational. */
  planId?: string | null;
  /** plan code carried into the payload (e.g. "pro"). */
  plan?: string | null;
  /** epoch seconds; defaults to now. */
  occurredAt?: number;
}

/** A delivery claimed for dispatch, joined with its app's webhook config. */
export interface ClaimedDelivery {
  id: string;
  workspaceId: string;
  tenantId: string;
  applicationId: string;
  eventType: DeliveryEventType;
  payload: ProvisioningPayload | GenericEventPayload;
  attempts: number;
  webhookUrl: string | null;
  webhookSecretRef: string | null;
}

/** Dispatcher tuning (env-driven; see provisioning.module). */
export interface DispatchConfig {
  maxAttempts: number;
  backoffBaseSec: number;
  backoffCapSec: number;
  leaseSeconds: number;
  batchSize: number;
  timeoutMs: number;
}

/** Resolves a webhook_secret_ref to the raw HMAC secret. Returns null if unknown. */
export interface WebhookSecretResolver {
  resolve(secretRef: string): string | null;
}

/** Receives alerts when a delivery exhausts its retries. */
export interface ProvisioningAlertSink {
  deliveryFailed(input: {
    deliveryId: string;
    tenantId: string;
    appCode: string;
    eventType: DeliveryEventType;
    attempts: number;
    lastResponseCode: number | null;
  }): void | Promise<void>;
}

/** Outcome of one dispatch pass (for logging / tests). */
export interface DispatchResult {
  recovered: number;
  claimed: number;
  delivered: number;
  retried: number;
  failed: number;
}
