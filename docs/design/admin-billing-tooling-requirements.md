# Admin billing tooling — requirements capture (for future rebuild)

> **Status: the 8 routers below were DELETED 2026-07-02** (task #23, decision
> "delete + capture intent"). They were **pre-existing dead code** — they queried
> the retired `identity.account` / `identity.account_profile` /
> `tenant.tenant_organization` schemas (removed by the account/tenant→identity
> renames that predate the platform-data-architecture project), so they had been
> broken/unused independent of that project. Modernizing them would have meant
> fixing three layers at once (account/tenant retirement + the new
> product/commerce model + usage-aggregation rewrite) — cheaper to **rebuild from
> a clean slate on the new model** if/when admin billing management is actually
> needed. This doc preserves what each screen was meant to do.

Rebuild target model (when resurrected): identity (`users`/`tenant`/`workspaces`),
product (`plan`/`plan_version`/`plan_component`/`product`), commerce
(`tenant_subscription` [workspace_id/plan_version_id], `quota_pool`,
`tenant_usage_event`, `tenant_invoice`(\_item product_id/metric_key), `tenant_payment`,
`tenant_transaction`), + entitlement chain (§8).

## The 8 admin surfaces (operator/admin-bff)

| Router (removed)      | Path                | Endpoints                                                                                                                           | Intended purpose                                                                                                                                                                                                                                         |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts` (223)      | `api/accounts`      | GET                                                                                                                                 | List customer billing accounts (org/tenant-level account view). Rebuild over `identity.tenant`/`workspaces`.                                                                                                                                             |
| `billing` (1500)      | `api/billing`       | GET, GET `:billId`, POST `:billId/offline-invoice-sync`, POST `:billId/actions`, POST `:billId/invoice-receipts/:receiptId/actions` | Operator bill/invoice management: browse bills, drill into one, sync offline invoices, run bill actions (issue/void/…), manage invoice-receipt actions. Rebuild over commerce `tenant_invoice`/`tenant_invoice_item`/`tenant_invoice_receipt`.           |
| `commercial` (830)    | `api/commercial`    | GET `usage-metering`, GET `promotions`, GET `promotion-redemptions`, GET `overview`                                                 | Commercial dashboards: usage/metering rollups, promotions + redemptions, a commercial overview. Rebuild usage over the new `tenant_usage_event` (workspace/product/metric) — NOT the old agent_id/feature_id axes.                                       |
| `invoices` (295)      | `api/invoices`      | GET                                                                                                                                 | List invoices (operator view). Rebuild over `tenant_invoice`.                                                                                                                                                                                            |
| `orders` (1043)       | `api/orders`        | GET, GET `:orderId`, POST `:orderId/offline-payment-confirm`                                                                        | Order management: browse/drill orders, confirm offline payments. Rebuild over the commerce order/payment tables.                                                                                                                                         |
| `payments` (598)      | `api/payments`      | GET, POST `:paymentId/verify`, POST `:paymentId/reject`                                                                             | Payment review: list payments, verify/reject a payment. Rebuild over `tenant_payment` (+ immutable `tenant_transaction` on confirm, §9).                                                                                                                 |
| `subscription` (1016) | `api/subscriptions` | GET, GET `:subscriptionId`, POST `manual`, POST `:subscriptionId/actions`                                                           | Admin subscription management: browse/drill subscriptions, manually create one, run actions (cancel/upgrade/…). Rebuild over `tenant_subscription` (workspace_id/plan_version_id) — reuse the R3a subscription service (create materializes quota_pool). |
| `tenants` (582)       | `api/tenants`       | GET                                                                                                                                 | List tenants with billing/usage context. Rebuild over `identity.tenant` + commerce rollups.                                                                                                                                                              |

## Notes for the rebuild

- The **subscription** + **payments/billing** service layers are already on the new
  model (R3a `pg-subscription`, R3c `pg-billing`), so a rebuilt admin surface should
  consume those services rather than raw SQL.
- **Usage/commercial** dashboards must be rebuilt on the §8 metering model
  (`tenant_usage_event` head/detail by workspace/product/metric, `quota_pool`), not
  the retired per-agent/per-feature aggregation.
- These were admin-bff raw-SQL routers; prefer going through the service packages.
