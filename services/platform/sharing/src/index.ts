export { SharingModule } from "./module/sharing.module";
export { SharingService } from "./service/sharing.service";
export { PgSharingRepository } from "./repository/pg-sharing.repository";
export { SHARING_PG_POOL, SHARING_CONFIG } from "./tokens";
export {
  mergeVisibleSet,
  strongerScope,
  isFresh,
  toVisibleResource,
  type HitGrant,
  type MergedVisibleRow,
} from "./visible-set";
export type {
  ResourceType,
  GranteeType,
  GrantScope,
  ActorType,
  GrantRecord,
  CreateGrantInput,
  RevokeGrantInput,
  VisibleResource,
  VisibleSetResult,
  SharingConfig,
} from "./types/sharing.types";
