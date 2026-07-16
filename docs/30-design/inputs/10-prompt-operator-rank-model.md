# Vxture 运营平台 Operator 分级权限模型改造

## 背景与目标

当前 Vxture 运营后台的 operator 管理存在一个设计缺陷：所有持有 `platform.admin.manage` 权限的 operator 可以无差别地操作任意其他 operator（包括重置密码、修改角色、停用账号），没有"谁能管谁"的层级校验。这导致：

1. 低级别角色（如 support）理论上可通过 API 重置高级别角色（如 admin）的密码并接管账号
2. 密码重置链接直接返回给发起方浏览器，发起方可自行打开链接设置密码，绕过"运营不掌握凭据"的设计意图
3. 修改角色接口（POST :id/role）无 rank 校验，低阶可将自己或他人提升为 super_admin

本次改造目标：引入 **分级管理模型**，核心规则为——

| 角色          | operator 管理能力          | 具体规则                                                                                      |
| ------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `super_admin` | ✔ 可管理所有非 super_admin | 能操作 admin 及以下所有角色；**不能操作其他 super_admin**（互操作禁止）                       |
| `admin`       | ✔ 可向下管理               | 只能操作 rank 严格低于自己的角色；**不能操作同级 admin**                                      |
| 其余角色      | ✗ 无管理能力               | operation / finance / tech_ops / support / auditor **均无 operator 管理权限**，无论 rank 高低 |

附加不变量：**系统中至少保留一个 active 状态的 super_admin 账号**，任何会导致 active super_admin 数量降为 0 的操作一律拒绝。

---

## 一、数据库变更

### 1.1 operator_role 表：新增 rank 列

当前表已有 `sort` 列（用于 UI 排序），`rank` 是独立的安全语义列，不复用 `sort`。

```sql
ALTER TABLE ops.operator_role
    ADD COLUMN rank integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN ops.operator_role.rank IS
    '角色安全等级，数值越大权限越高。用于跨 operator 操作的层级校验。'
    '注意：rank 仅作为层级比较依据，管理能力由 operator:account.manage 权限决定，'
    '只有 super_admin 和 admin 角色持有该权限。';

-- 预置角色 rank 值
UPDATE ops.operator_role SET rank = 100 WHERE role_code = 'super_admin';
UPDATE ops.operator_role SET rank = 80  WHERE role_code = 'admin';
UPDATE ops.operator_role SET rank = 60  WHERE role_code = 'operation';
UPDATE ops.operator_role SET rank = 60  WHERE role_code = 'finance';
UPDATE ops.operator_role SET rank = 50  WHERE role_code = 'tech_ops';
UPDATE ops.operator_role SET rank = 30  WHERE role_code = 'support';
UPDATE ops.operator_role SET rank = 10  WHERE role_code = 'auditor';

CREATE INDEX idx_operator_role_rank ON ops.operator_role (rank);
```

**rank 值设计说明**：

- `super_admin (100)`：顶层，能管 admin 及以下，**不能互操作**
- `admin (80)`：能管 operation/finance/tech_ops/support/auditor，不能管 super_admin，不能管同级 admin
- `operation / finance (60)`：同级但无管理能力
- `tech_ops (50)`：无管理能力
- `support (30)`：无管理能力
- `auditor (10)`：纯只读，无管理能力
- 留出间距（10/30/50/60/80/100）方便将来插入新角色

---

## 二、核心安全规则（应用层实现）

### 2.1 管理能力门控（Ability Gate）

Rank gate 不是通用的"高管低"——它是**权限 + rank 双层门控**：

```
第一层（权限）：actor 是否持有 operator:account.manage 权限？
  → 只有 super_admin 和 admin 两个角色持有
  → 其余角色在此层直接拒绝，返回 403 PERMISSION_DENIED

第二层（rank）：actor.role.rank > target.role.rank？
  → 严格大于，等级相同也禁止（super_admin 互操作禁止、admin 同级禁止）
  → 违反时返回 403 INSUFFICIENT_RANK

第三层（存活保护）：操作是否会导致 active super_admin 数量降为 0？
  → 适用于：停用/删除/降级 super_admin 账号
  → 违反时返回 409 LAST_SUPER_ADMIN，消息："无法执行此操作，系统必须保留至少一个活跃的超级管理员"
```

### 2.2 适用接口清单

所有跨 operator 操作必须经过三层门控：

| 接口                               | 操作描述      | 特殊校验                          |
| ---------------------------------- | ------------- | --------------------------------- |
| POST /operators                    | 创建 operator | 新账号角色 rank 必须 < actor rank |
| PUT /operators/:id/role            | 修改角色      | 双重校验（见 2.3）                |
| POST /operators/:id/reset-password | 重置密码      | —                                 |
| PUT /operators/:id/status          | 停用/启用     | 存活保护（见 2.4）                |
| DELETE /operators/:id              | 删除账号      | 存活保护（见 2.4）                |
| PUT /operators/:id/mfa/reset       | 重置 MFA      | —                                 |

### 2.3 changeRole 双重校验

修改角色是唯一需要检查两个 rank 的接口：

```
校验 1：actor.rank > target.currentRole.rank  （我有权管这个人）
校验 2：actor.rank > newRole.rank              （我不能把人提到我之上或同级）
校验 3：如果 target 当前是 super_admin 且操作使其不再是 super_admin → 触发存活保护
```

### 2.4 最后一个 super_admin 存活保护

```
触发条件：
  - 停用 super_admin 账号（changeStatus → inactive/suspended）
  - 删除 super_admin 账号（deleteOperator）
  - 将 super_admin 降级为其他角色（changeRole → rank < 100）

校验逻辑：
  COUNT(active super_admin) - 即将失去的数量 >= 1

实现参考：
  SELECT count(*) FROM ops.operator_account oa
    JOIN ops.operator_role r ON oa.role_id = r.id
    WHERE r.role_code = 'super_admin'
      AND oa.status = 'active'
      AND oa.deleted_at IS NULL
      AND oa.id != $targetId;  -- 排除即将被操作的目标
  → 结果 < 1 时拒绝操作
```

### 2.5 自操作规则

operator 对自己的操作遵循以下规则：

```
✅ 允许：修改自己的显示名、修改自己的密码（当前密码验证后）
❌ 禁止：修改自己的角色（防自我提权）
❌ 禁止：停用/删除自己（防误操作锁死系统）
```

### 2.6 Operator Management Guard 中间件

```typescript
// file: src/middleware/operatorManagementGuard.middleware.ts

/**
 * Operator 管理操作的三层门控中间件
 *
 * 业务规则：
 *   - 只有 super_admin 和 admin 可以管理 operator
 *   - super_admin 之间互操作禁止
 *   - admin 只能向下管理（严格低于自己的 rank）
 *   - 其余角色（operation/finance/tech_ops/support/auditor）无管理能力
 *   - 系统至少保留一个 active super_admin
 *
 * 用法：router.put('/:id/role', operatorManagementGuard(), changeRoleHandler)
 */
export function operatorManagementGuard() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actorId = req.operatorSession.operatorId;
    const targetId = req.params.id;

    // ── 自操作检测 ──
    if (actorId === targetId) {
      const selfForbiddenActions = [
        "changeRole",
        "changeStatus",
        "deleteOperator",
      ];
      if (selfForbiddenActions.includes(req.routeAction)) {
        return res.status(403).json({
          code: "SELF_OPERATION_FORBIDDEN",
          message: "Cannot perform this action on your own account",
        });
      }
      return next(); // 改显示名、改自己密码等放行
    }

    // ── 第一层：权限门控 ──
    // actor 必须持有 operator:account.manage 权限
    // 只有 super_admin 和 admin 角色被分配了此权限
    // 此处假设已有 hasPermission 工具函数
    const canManage = await hasPermission(actorId, "operator:account.manage");
    if (!canManage) {
      return res.status(403).json({
        code: "PERMISSION_DENIED",
        message: "Your role does not have operator management capability",
      });
    }

    // ── 第二层：rank 门控 ──
    const ranks = await db.query(
      `
      SELECT
        actor_role.rank       AS actor_rank,
        actor_role.role_code  AS actor_role_code,
        target_role.rank      AS target_rank,
        target_role.role_code AS target_role_code
      FROM ops.operator_account actor
        JOIN ops.operator_role actor_role ON actor.role_id = actor_role.id
      CROSS JOIN ops.operator_account target
        JOIN ops.operator_role target_role ON target.role_id = target_role.id
      WHERE actor.id = $1
        AND target.id = $2
        AND actor.deleted_at IS NULL
        AND target.deleted_at IS NULL
    `,
      [actorId, targetId],
    );

    if (!ranks.rows.length) {
      return res.status(404).json({ code: "OPERATOR_NOT_FOUND" });
    }

    const { actor_rank, actor_role_code, target_rank, target_role_code } =
      ranks.rows[0];

    // 严格大于：同级禁止（含 super_admin 互操作禁止）
    if (actor_rank <= target_rank) {
      return res.status(403).json({
        code: "INSUFFICIENT_RANK",
        message: "Cannot manage an operator with equal or higher rank",
      });
    }

    // ── changeRole 额外校验：新角色 rank 必须 < actor rank ──
    if (req.routeAction === "changeRole" && req.body.roleId) {
      const newRole = await db.query(
        "SELECT rank, role_code FROM ops.operator_role WHERE id = $1",
        [req.body.roleId],
      );
      if (!newRole.rows.length) {
        return res.status(404).json({ code: "ROLE_NOT_FOUND" });
      }
      if (newRole.rows[0].rank >= actor_rank) {
        return res.status(403).json({
          code: "INSUFFICIENT_RANK",
          message:
            "Cannot assign a role with equal or higher rank than your own",
        });
      }
    }

    // ── 第三层：最后一个 super_admin 存活保护 ──
    const needsSurvivalCheck =
      target_role_code === "super_admin" &&
      ["changeStatus", "deleteOperator", "changeRole"].includes(
        req.routeAction,
      );

    if (needsSurvivalCheck) {
      // changeRole 降级时才触发（如果新角色仍是 super_admin 则无需检查）
      let isDowngrade = true;
      if (req.routeAction === "changeRole" && req.body.roleId) {
        const newRole = await db.query(
          "SELECT role_code FROM ops.operator_role WHERE id = $1",
          [req.body.roleId],
        );
        isDowngrade = newRole.rows[0]?.role_code !== "super_admin";
      }

      if (isDowngrade || req.routeAction !== "changeRole") {
        const remaining = await db.query(
          `
          SELECT count(*)::int AS cnt
          FROM ops.operator_account oa
            JOIN ops.operator_role r ON oa.role_id = r.id
          WHERE r.role_code = 'super_admin'
            AND oa.status = 'active'
            AND oa.deleted_at IS NULL
            AND oa.id != $1
        `,
          [targetId],
        );

        if (remaining.rows[0].cnt < 1) {
          return res.status(409).json({
            code: "LAST_SUPER_ADMIN",
            message:
              "Cannot perform this action: at least one active super admin must remain",
          });
        }
      }
    }

    next();
  };
}
```

---

## 三、密码重置链接投递方式改造

### 3.1 当前流程（存在提权向量）

```
Admin A 点击"重置 Operator B 密码"
  → 后端生成 reset token
  → token/link 返回给 A 的浏览器弹窗显示
  → A 可以自己打开链接，给 B 设一个 A 知道的密码
  → A 用 B 的账号登录 ← 提权
```

### 3.2 目标流程（带外投递）

```
Admin A 点击"重置 Operator B 密码"
  → 三层门控校验通过
  → 后端生成 reset token
  → token/link 通过邮件发送到 Operator B 本人的注册邮箱
  → 后端仅返回 { success: true, deliveredTo: "b***@company.com" }（脱敏）
  → B 本人收到邮件，自行设置新密码
  → A 全程不接触 token
```

### 3.3 改造要点

**后端**（参考位置：`operator-admin-internal.router.ts:171` 附近的 `resetPlatformAdminPassword`）：

```typescript
// BEFORE（当前实现 - 有安全问题）
// const resetLink = generateResetLink(targetOperator);
// return res.json({ resetLink });  ← link 回传给调用方

// AFTER（改造后）
async function resetPlatformAdminPassword(req, res) {
  const actorId = req.operatorSession.operatorId;
  const targetId = req.params.id;

  // 三层门控已在中间件完成

  const target = await getOperatorById(targetId);
  if (!target.email) {
    return res.status(422).json({
      code: "NO_EMAIL",
      message:
        "Target operator has no email address for password reset delivery",
    });
  }

  // 生成 token（保持现有逻辑）
  const resetToken = await generateResetToken(targetId);

  // 带外投递：发邮件给目标本人
  await emailService.send({
    to: target.email,
    template: "operator-password-reset",
    data: {
      displayName: target.display_name,
      resetLink: `${OPS_PORTAL_URL}/reset-password?token=${resetToken}`,
      expiresInMinutes: 30,
      initiatedBy: req.operatorSession.displayName, // 告知 B 是谁发起的
    },
  });

  // 写审计日志
  await auditLog.write({
    action: "operator.password_reset.initiated",
    actorId,
    targetId,
    detail: { deliveredTo: maskEmail(target.email) },
  });

  // 不返回 token/link，只返回投递确认
  return res.json({
    success: true,
    deliveredTo: maskEmail(target.email), // "b***@company.com"
  });
}
```

**前端**（参考位置：`PlatformUsersPage` 弹窗）：

```
// BEFORE：弹窗显示 reset link，可复制
// AFTER：弹窗显示"重置链接已发送至 b***@company.com"，无链接可复制
```

**email 必须存在约束**：

- `operator_account.email` 当前允许 NULL，密码重置改为邮件投递后，没有邮箱的 operator 无法被远程重置
- 建议：创建 operator 时 email 改为 NOT NULL（或至少在重置时做运行时检查并返回明确错误，如上方代码所示）
- 可选：支持短信作为备用通道（`target.phone`），但邮件优先

---

## 四、前端 UI 适配

### 4.1 Operator 列表页

- 后端在列表查询时计算 `canManage: boolean` 字段（基于三层门控逻辑）
- `canManage = false` 的行：操作列按钮隐藏或灰置，hover 提示"权限不足"
- operation / finance / tech_ops / support / auditor 登录后，所有 operator 行均无操作按钮（因第一层权限门控未通过）

### 4.2 角色选择下拉框

- 创建 operator / 修改角色时，下拉框只显示 rank < 当前用户 rank 的角色
- 后端接口 `GET /roles/assignable` 返回过滤后的列表
- admin 能看到：operation / finance / tech_ops / support / auditor
- super_admin 能看到：admin / operation / finance / tech_ops / support / auditor（不含 super_admin 自身）

### 4.3 密码重置弹窗

- 移除原有的"复制重置链接"按钮
- 改为确认弹窗："确认向 b\*\*\*@company.com 发送密码重置邮件？"
- 成功后显示"已发送"提示

### 4.4 Operator 管理入口可见性

- operation / finance / tech_ops / support / auditor 角色的侧边栏中，隐藏"Operator 管理"菜单项（perm_type = menu 的 `operator:account.manage` 权限控制）
- 避免不必要的 403 体验

---

## 五、审计日志增强

所有跨 operator 操作必须写审计日志，包含 rank 信息和门控结果：

```typescript
await auditLog.write({
  action: "operator.role.changed", // 或 .status.changed / .password_reset / .deleted
  actorId: actorId,
  actorRoleCode: actorRole.role_code,
  actorRank: actorRole.rank,
  targetId: targetId,
  targetRoleCode: targetRole.role_code,
  targetRank: targetRole.rank,
  detail: {
    previousRoleCode: oldRole.role_code,
    previousRank: oldRole.rank,
    newRoleCode: newRole.role_code,
    newRank: newRole.rank,
  },
});
```

**被拒绝的操作也应记录**（用于安全告警）：

```typescript
await auditLog.write({
  action: "operator.management.denied",
  actorId: actorId,
  targetId: targetId,
  detail: {
    attemptedAction: req.routeAction,
    denyReason: "INSUFFICIENT_RANK", // 或 PERMISSION_DENIED / LAST_SUPER_ADMIN / SELF_OPERATION_FORBIDDEN
  },
});
```

---

## 六、测试用例清单

### 6.1 权限门控（第一层）

```
❌ operation(60)  尝试重置 support(30) 密码 → 403 PERMISSION_DENIED（无管理权限，即使 rank 更高）
❌ finance(60)    尝试停用 auditor(10) 账号 → 403 PERMISSION_DENIED
❌ tech_ops(50)   尝试删除 support(30) 账号 → 403 PERMISSION_DENIED
❌ support(30)    尝试修改 auditor(10) 角色 → 403 PERMISSION_DENIED
❌ auditor(10)    尝试创建 operator         → 403 PERMISSION_DENIED
```

### 6.2 Rank 门控（第二层）

```
✅ super_admin(100) 可重置 admin(80) 密码
✅ super_admin(100) 可停用 support(30) 账号
✅ admin(80)        可停用 support(30) 账号
✅ admin(80)        可创建 operation(60) 账号
❌ super_admin(100) 不能重置另一个 super_admin(100) 密码 → 403 INSUFFICIENT_RANK（互操作禁止）
❌ super_admin(100) 不能停用另一个 super_admin(100)       → 403 INSUFFICIENT_RANK
❌ admin(80)        不能重置 super_admin(100) 密码        → 403 INSUFFICIENT_RANK
❌ admin(80)        不能停用另一个 admin(80) 账号         → 403 INSUFFICIENT_RANK（同级禁止）
```

### 6.3 changeRole 双重校验

```
✅ super_admin(100) 可将 support(30) 改为 admin(80)
✅ admin(80)        可将 support(30) 改为 operation(60)
❌ super_admin(100) 不能将 admin(80) 改为 super_admin(100)  → 403（不能授予同级角色）
❌ admin(80)        不能将 support(30) 改为 super_admin(100) → 403（新角色 rank >= actor rank）
❌ admin(80)        不能将 support(30) 改为 admin(80)        → 403（等于也禁止）
```

### 6.4 存活保护（第三层）

```
❌ super_admin 停用唯一的另一个 super_admin（自己 + 目标 = 2，操作后剩 1） → ✅ 允许
❌ super_admin 停用最后一个其他 super_admin（操作后 active 只剩自己 = 1）  → ✅ 允许（自己还在）
❌ 通过 changeRole 将唯一 active super_admin 降级 → 409 LAST_SUPER_ADMIN
❌ 停用系统中唯一 active 的 super_admin           → 409 LAST_SUPER_ADMIN
   注意：由于互操作禁止，正常流程中不会出现"super_admin 停用自己"的路径，
   但存活保护作为兜底，在数据库直连操作场景（break-glass）也应生效
```

### 6.5 自操作规则

```
❌ 任何人不能修改自己的角色     → 403 SELF_OPERATION_FORBIDDEN
❌ 任何人不能停用/删除自己       → 403 SELF_OPERATION_FORBIDDEN
✅ 任何人可以修改自己的显示名
✅ 任何人可以修改自己的密码（需验证当前密码）
```

### 6.6 密码重置投递

```
✅ 重置请求成功后，response 中不包含 token 或 link
✅ 目标邮箱收到重置邮件，邮件内包含发起者姓名
✅ 目标无邮箱时返回 422 NO_EMAIL
✅ 审计日志记录了操作，deliveredTo 为脱敏邮箱
```

### 6.7 前端适配

```
✅ operation/finance/tech_ops/support/auditor 登录后看不到"Operator 管理"菜单
✅ admin 的 operator 列表中，super_admin 和同级 admin 行无操作按钮
✅ super_admin 的 operator 列表中，其他 super_admin 行无操作按钮
✅ 角色下拉只显示 rank < 当前用户的角色（super_admin 看不到 super_admin 选项）
✅ 密码重置弹窗无链接展示，只有"已发送至邮箱"提示
```

---

## 七、迁移注意事项

1. **rank 列的默认值**：新增列 `DEFAULT 0`，确保未赋值的角色 rank 最低，不会意外获得管理权限
2. **数据迁移顺序**：先加 rank 列并 UPDATE 种子数据 → 再部署带门控的应用代码 → 最后改前端。反过来会导致前端调 API 被拒
3. **operator_account.email NOT NULL**：如果改为强制，需先排查现有数据中 email 为 NULL 的 operator 并补充
4. **向后兼容**：门控中间件上线后，现有旧客户端调用会被正常校验（rank 和权限从 DB 取，不依赖前端传入），不需要客户端升级
5. **operator:account.manage 权限分配**：确保 operator_role_permission 种子数据中，只有 super_admin 和 admin 两个角色关联了此权限

---

## 八、破玻璃流程（Break-Glass）

由于 super_admin 互操作禁止，需要预留一条受控的紧急通道：

**触发场景**：唯一的 super_admin 失联/离职/账号被锁死

**流程**：

1. 由 DBA 或 infrastructure owner 通过数据库直连操作（需 VPN + 堡垒机）
2. 修改前：记录完整的操作理由、执行人、时间到独立的变更审计表或工单系统
3. 执行 SQL：直接 UPDATE operator_account 的 status 或 role_id
4. 修改后：立即通知全体 admin 级 operator（邮件/即时通讯）
5. 事后：在最近一次安全例会中复盘

**技术保障**：

- 数据库层面的存活保护（可选 trigger，确保即使直连也不会删到 0 个 super_admin）

```sql
-- 可选：DB 层兜底 trigger，防止即使直连也删到 0
CREATE OR REPLACE FUNCTION ops.check_last_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  remaining int;
BEGIN
  -- 只在可能减少 active super_admin 数量的操作时触发
  IF TG_OP = 'DELETE' OR NEW.status != 'active' OR NEW.deleted_at IS NOT NULL THEN
    SELECT count(*) INTO remaining
    FROM ops.operator_account oa
      JOIN ops.operator_role r ON oa.role_id = r.id
    WHERE r.role_code = 'super_admin'
      AND oa.status = 'active'
      AND oa.deleted_at IS NULL
      AND oa.id != COALESCE(OLD.id, NEW.id);

    IF remaining < 1 THEN
      RAISE EXCEPTION 'Cannot remove the last active super_admin (LAST_SUPER_ADMIN)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_last_super_admin
  BEFORE UPDATE OR DELETE ON ops.operator_account
  FOR EACH ROW
  EXECUTE FUNCTION ops.check_last_super_admin();
```

---

## 九、不在本次范围但需记录

- **临时授权（JIT access）**：当前 operator_account.role_id 是单值，不支持"客服临时获得 admin 权限 2 小时"。未来如需此能力，需新增 `operator_role_assignment` 表（类似租户侧的 role_assignment 设计），本次不做
- **IP 白名单**：super_admin 建议限制登录 IP（办公网/VPN），但属于独立安全策略，不阻断本次改造
- **rank 值不可由 API 修改**：operator_role.rank 应排除在 role 更新接口的可写字段之外，只能通过数据库迁移调整。列级权限已在 tenancy 侧实践，ops 侧建议同步应用：

```sql
REVOKE UPDATE ON ops.operator_role FROM ops_svc;
GRANT UPDATE (role_code, status, name_en, name_i18n_key,
              description, description_i18n_key, is_system,
              sort, mfa_min_level, updated_by, updated_at)
    ON ops.operator_role TO ops_svc;
-- rank, id, created_at, created_by 不在列清单内，API 层面物理上改不动
```
