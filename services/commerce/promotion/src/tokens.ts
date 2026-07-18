// Same token string as @vxture/service-subscription. PromotionModule provides
// its own pool under this token but deliberately does NOT export it
// (product_321 §5.1): exporting a second provider for the same string token
// would make consumer injection drift with module import order.
export const COMMERCE_PG_POOL = "COMMERCE_PG_POOL";
