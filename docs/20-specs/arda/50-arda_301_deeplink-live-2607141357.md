# 平台通知：console 转化深链落地页已上产，请端到端验证（arda_301_deeplink-live）

> 时间标记：**2607141357**（YYMMDDHHMM）· 方向：**vxture 平台（线 A）→ arda（线 B）**
> 性质：**上产通知 + 联测请求**（对接定型后的一次性通知，非契约变更；契约以 [`arda_200`](./30-arda_200_interface.md) / [`arda_300`](./40-arda_300_integration-final.md) 为准）。

---

## 1. 已上产

console 侧转化深链落地页 **`/subscribe`** 已上生产（三支平齐部署）。这是 arda 门控 UX 里"升级/续费/加购"深链的真实承接页——此前产品端点了深链会落空，现在有真实落地。

## 2. 落地地址（已钉入契约）

```
GET https://console.vxture.com/subscribe?product=arda&intent={upgrade|renew|addon}[&target_tier=][&metric=]
```

- `product` / `intent` 必带；`target_tier`（升级目标档，console 预选）/ `metric`（addon 场景，哪个额度用尽）选带；
- **`workspace_id` 由 console 会话的活跃租户解析，产品不带也不应带**；
- 权威 = [`product_200`](../../30-design/product_200_integration.md) §3.2；产品侧义务 = [`arda_300`](./40-arda_300_integration-final.md) §转化出口。

## 3. 落地页行为（联测预期）

- **未知 intent / 未知 product** → 降级到订阅管理首页（保留 product 上下文）；
- **已知 intent + 无效 target_tier** → 进入流程、忽略无效参数（不预选档位）；
- **状态感知**：落地页按当前订阅事实渲染首要动作——临期突出续费 / trialing 突出转正 / 从无订阅突出开通；
- **升级**接通真实订阅变更（`POST /api/subscription/actions`）；**加购（addon）**在 add-on SKU 建成前出提示文案；**不伪造自助结账**（支付面未建）；
- **未登录**深链 → 跳登录，登录后回到 `/subscribe`（query 保留，上下文不丢）。

## 4. 请线 B 联测一遍

从 arda 门控 UX 点"升级"，端到端走：

1. arda 拼出 `console.vxture.com/subscribe?product=arda&intent=upgrade&target_tier=<档>` 并**显式点击**打开（不自动跳）；
2. 未登录 → 登录门 → 登录后回落地页；
3. 落地页看到：当前订阅卡片（状态/档位/周期）+ 套餐阶梯（当前档标记、target_tier 推荐标记）+ 升级按钮；
4. 未知 intent（如把 intent 改成 `seat` 或乱填）→ 应降级到订阅管理首页，不报错。

结果回传对账追踪即可（`arda-plat-300-tracking.md`）。

## 5. 联系

平台侧：Stone Smoker（yanhaoguo@gmail.com）。
