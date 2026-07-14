/**
 * commerce-services.provider.ts - module-less subscription/provisioning wire
 * @package @vxture/bff-admin
 *
 * admin-bff stays "operator governance face only" (app.module.ts: no
 * commerce service modules) — but offline-payment-confirm needs the
 * subscription lifecycle's provisioning hooks to actually notify arda
 * (product_320 §4.3; fixes the pre-existing raw-SQL activation bypass that
 * silently skipped the tenant.provisioned webhook). Built the same
 * module-less way arda-catalog.itest.spec.ts constructs these classes for a
 * live-DB test: a bare Pool in, a SubscriptionService out. The
 * ProvisioningService here only enqueues — dispatch config is never
 * exercised because delivery dispatch runs in platform-api (D13), not here.
 */
import { Provider } from "@nestjs/common";
import { Pool } from "pg";
import {
  PgSubscriptionRepository,
  SubscriptionService,
} from "@vxture/service-subscription";
import {
  PgProvisioningRepository,
  ProvisioningService,
} from "@vxture/service-provisioning";
import { ADMIN_BFF_RW_POOL } from "../tokens";

export const ADMIN_SUBSCRIPTION_SERVICE = "ADMIN_SUBSCRIPTION_SERVICE";

export const commerceServicesProvider: Provider = {
  provide: ADMIN_SUBSCRIPTION_SERVICE,
  inject: [ADMIN_BFF_RW_POOL],
  useFactory: (pool: Pool): SubscriptionService => {
    const provisioning = new ProvisioningService(
      new PgProvisioningRepository(pool),
      {
        maxAttempts: 1,
        backoffBaseSec: 1,
        backoffCapSec: 1,
        leaseSeconds: 1,
        batchSize: 1,
        timeoutMs: 1000,
      },
      { resolve: () => null },
      { deliveryFailed: () => {} },
    );
    return new SubscriptionService(
      new PgSubscriptionRepository(pool),
      provisioning,
    );
  },
};
