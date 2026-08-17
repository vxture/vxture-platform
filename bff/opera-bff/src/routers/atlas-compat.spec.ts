/**
 * atlas-compat.spec.ts —— 两代形状归一。
 *
 * 这一层的价值全在「**两代都成立**」上，而那正是肉眼最难验的东西：本地只连得到其中
 * 一代。测试是唯一能同时按住两边的地方。
 */
import { describe, expect, it } from "vitest";
import { normalizeAtlasAuditRow, normalizeAtlasState } from "./atlas-compat";

describe("state ⇄ isActive 双向补齐", () => {
  it("旧 atlas（只有 isActive）→ 补出 state", () => {
    const rows = [
      { id: "p1", isActive: true },
      { id: "p2", isActive: false },
    ];
    normalizeAtlasState(rows);
    expect(rows[0]).toMatchObject({ isActive: true, state: "active" });
    expect(rows[1]).toMatchObject({ isActive: false, state: "inactive" });
  });

  it("新 atlas（只有 state）→ 补出 isActive", () => {
    const rows = [{ state: "active" }, { state: "inactive" }];
    normalizeAtlasState(rows);
    expect(rows[0]).toMatchObject({ isActive: true });
    expect(rows[1]).toMatchObject({ isActive: false });
  });

  /**
   * 这条是整个文件存在的理由。`deprecated` 的 `is_active` 是 **true**——把它反向映射成
   * `false`，界面上一个仍在服务的模型会显示成「停用」，而且不报任何错。
   */
  it("deprecated 仍算「运营意图开着」——不是停用", () => {
    const row = { state: "deprecated" };
    normalizeAtlasState(row);
    expect(row).toMatchObject({ isActive: true });
  });

  it("两个都有时一个都不改（上游是权威，这一层只补不覆盖）", () => {
    const row = { state: "deprecated", isActive: true };
    normalizeAtlasState(row);
    expect(row).toEqual({ state: "deprecated", isActive: true });
  });

  it("不给没有这个概念的对象凭空加字段", () => {
    const row = { id: "x", providerCode: "openai" };
    normalizeAtlasState(row);
    expect(row).toEqual({ id: "x", providerCode: "openai" });
  });

  it("下探嵌套：{items:[…]} 与 endpoint.models[]", () => {
    const page = {
      items: [{ isActive: true, models: [{ isActive: false }] }],
      nextCursor: null,
    };
    normalizeAtlasState(page);
    expect(page.items[0]).toMatchObject({ state: "active" });
    expect(page.items[0]!.models[0]).toMatchObject({ state: "inactive" });
  });

  it("null / 标量原样返回，不炸", () => {
    expect(normalizeAtlasState(null)).toBeNull();
    expect(normalizeAtlasState("x")).toBe("x");
    expect(normalizeAtlasState(3)).toBe(3);
  });
});

describe("审计行字段更名", () => {
  const oldRow = () => ({
    id: "e1",
    operatorSub: "opr_1",
    actorClientId: "opera",
    resourceType: "provider",
    resourceId: "p1",
    action: "update",
    occurredAt: "2026-08-17T00:00:00Z",
    outcome: "success",
  });

  it("旧名补出新名，旧名保留（上游部署前后都读得到）", () => {
    const row = oldRow();
    normalizeAtlasAuditRow(row);
    expect(row).toMatchObject({
      eventId: "e1",
      actorId: "opr_1",
      actorConsole: "opera",
      objectType: "provider",
      objectId: "p1",
    });
  });

  it("新 atlas 的行原样通过", () => {
    const row = {
      eventId: "e9",
      actorId: "opr_9",
      action: "deactivate",
      occurredAt: "2026-08-17T00:00:00Z",
    };
    normalizeAtlasAuditRow(row);
    expect(row).toEqual({
      eventId: "e9",
      actorId: "opr_9",
      action: "deactivate",
      occurredAt: "2026-08-17T00:00:00Z",
    });
  });

  /**
   * 靠 `occurredAt` + `action` 两个字段同时在场判定「这是审计行」。
   * 用单个 `id` 判会误伤——满仓都是 id，给每个带 id 的对象补一个 `eventId` 是制造垃圾。
   */
  it("不是审计行的对象不碰，哪怕它有 id", () => {
    const row = { id: "p1", providerCode: "openai", occurredAt: "2026-08-17" };
    normalizeAtlasAuditRow(row);
    expect(row).not.toHaveProperty("eventId");
  });

  it("下探分页容器", () => {
    const page = { items: [oldRow()], nextCursor: "c1" };
    normalizeAtlasAuditRow(page);
    expect(page.items[0]).toMatchObject({ eventId: "e1", actorId: "opr_1" });
  });
});
