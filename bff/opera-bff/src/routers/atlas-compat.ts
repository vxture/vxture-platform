/**
 * atlas-compat.ts — 把 atlas 的两代形状归一到一种（product_251 B-3 / X-3）。
 * @package @vxture/bff-opera
 * @layer BFF
 *
 * ## 为什么需要，以及为什么放在这一层
 *
 * atlas 已合并 M-B3（`isActive` 布尔 → `state` 枚举，[atlas#216](https://github.com/vxture/vxture-atlas/issues/216)）
 * 与 X-3（审计字段更名，#215），但**尚未部署**——实测活着的容器仍返回 `isActive`。
 *
 * 直接把 opera 改成读 `state`，今天就读不到；不改，他们部署那天 opera 读到的是
 * `undefined`——而 `undefined` 是假值，**每一行都会显示成「停用」，不报任何错**。
 * 后者比断掉更糟：断了有人喊，显示错的没人喊。
 *
 * 所以归一放在**适配层的单一出口**（`AtlasRouter.request()`），而不是让九个页面各写一遍
 * `r.state ?? (r.isActive ? "active" : "inactive")`：
 *
 * - 对上游两代都成立，**不需要与 atlas 的部署对表**；
 * - 页面只见一种形状，删除兼容时只删这一个文件。
 *
 * ## 删除条件（写在这里，不然它会永远留着）
 *
 * 分两步，别一起删：
 *
 * 1. **atlas 部署后**——`normalizeAtlasState` 的「补 `state`」分支与 `normalizeAtlasAuditRow`
 *    整个可以删（一次 curl 看返回体里还有没有 `isActive` / `operatorSub` 即可判断）。
 * 2. **页面完成 `isActive` → `state` 的语义迁移后**——「补 `isActive`」分支才能删。
 *    这一步不是改名，要逐处判断 `deprecated` 该算「在服务」还是「已停用」，见下。
 *
 * ## 不做的事
 *
 * **不碰动词。** `PUT` → `PATCH`（#214）无法在这里兼容——同一个请求发不出两种方法，
 * 试完一个再试另一个会把写操作变成「可能执行两次」。那条必须与 atlas 的部署严格排序。
 */

/**
 * 下探的最大**对象**层数。atlas 的响应最深是 `{items:[{ models:[{…}] }]}` = 三层对象。
 *
 * **数组不计一层**——它是容器不是嵌套层级。最初把它算进去，`models[]` 里的行正好越界
 * 没被归一（单测抓到的）：那种漏归一在页面上表现为「这一列全是停用」，不报错。
 */
const MAX_DEPTH = 3;

/**
 * 就地补齐缺的那一个，**两个方向都补**。
 *
 * 最初写的是单向（只补 `state`，不补 `isActive`），理由是「反向补等于让旧字段在新世界
 * 里复活」。**那个判断是错的，这里改了**——因为 `state` 有第三个值：
 *
 * > `deprecated` —— 仍可解析、不再推荐。它的 `is_active` 是 **true**。
 *
 * 所以 `isActive` 与 `state === "active"` **不等价**。只补一个方向，就是逼页面立刻做
 * 语义迁移；而把 30 多处 `isActive` 机械换成 `state === "active"`，会让**已弃用但仍在
 * 服务的模型显示成「停用」**——一次静默的语义错，正是本规范整组 B 要防的那类。
 *
 * 两边都补，代价是旧字段多活一阵；收益是**页面迁移可以按语义逐处做，而不是被部署时点
 * 逼着一次性做完**。反向映射按 atlas 自己的优先级（`deleted_at` > `is_active` >
 * `deprecated_at`）：只有 `inactive` 才是「运营把它关了」，`deprecated` 仍算开着。
 */
export function normalizeAtlasState<T>(value: T, depth = 0): T {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) normalizeAtlasState(item, depth);
    return value;
  }

  const record = value as Record<string, unknown>;
  const hasIsActive = typeof record["isActive"] === "boolean";
  const hasState = typeof record["state"] === "string";

  if (hasIsActive && !hasState) {
    // 旧 atlas → 补 state。布尔装不下 `deprecated`，所以这个方向只可能得到两值。
    record["state"] = record["isActive"] ? "active" : "inactive";
  } else if (hasState && !hasIsActive) {
    // 新 atlas → 补 isActive。`deprecated` 仍是「运营意图开着」，只有 inactive 才是关。
    record["isActive"] = record["state"] !== "inactive";
  }

  for (const key of Object.keys(record)) {
    const child = record[key];
    if (child !== null && typeof child === "object") {
      normalizeAtlasState(child, depth + 1);
    }
  }
  return value;
}

/**
 * 审计行的字段更名（atlas#204 / #215）。同样是**只补不覆盖**、单向。
 *
 * `actorConsole` 那一格值得单记：atlas 侧它不是新列，是既有的 `actorClientId`
 * （令牌里的 `act.sub`，铸造这次换票的工作台 RP）改名——所以这里的映射是改名，
 * 不是从别处推导出一个值。规范 X-3 已把这个来源写死。
 */
const AUDIT_RENAMES: Readonly<Record<string, string>> = {
  id: "eventId",
  operatorSub: "actorId",
  actorClientId: "actorConsole",
  resourceType: "objectType",
  resourceId: "objectId",
};

export function normalizeAtlasAuditRow<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    for (const item of value) normalizeAtlasAuditRow(item);
    return value;
  }

  const record = value as Record<string, unknown>;

  /* 只认审计行：靠 `occurredAt` + `action` 两个字段同时在场判定。用单个字段判会误伤
     ——`id` 满仓都是，把任意带 id 的对象都补一个 `eventId` 是在制造垃圾。 */
  const looksLikeAuditRow =
    typeof record["occurredAt"] === "string" &&
    typeof record["action"] === "string";

  if (looksLikeAuditRow) {
    for (const [oldKey, newKey] of Object.entries(AUDIT_RENAMES)) {
      if (record[newKey] === undefined && record[oldKey] !== undefined) {
        record[newKey] = record[oldKey];
      }
    }
  }

  for (const key of Object.keys(record)) {
    const child = record[key];
    if (child !== null && typeof child === "object") {
      normalizeAtlasAuditRow(child);
    }
  }
  return value;
}
