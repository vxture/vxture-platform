/**
 * OperatorPasskeyManager.tsx - operator passkey management (list/add/rename/revoke).
 * @package @vxture/accounts
 *
 * The credential-management UI for an authenticated operator (P3.4). Lists the
 * operator's registered passkeys and supports adding (registration ceremony),
 * renaming, and revoking. All calls are cookie-authenticated (vx_sid_op) against
 * the IdP on the accounts surface. Revoking the last passkey of a
 * webauthn-required operator is blocked server-side (surfaced as an error).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listOperatorPasskeys,
  registerOperatorPasskey,
  renameOperatorPasskey,
  revokeOperatorPasskey,
  type OperatorPasskey,
} from "@/api/operator-webauthn";

export function OperatorPasskeyManager() {
  const [passkeys, setPasskeys] = useState<OperatorPasskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      setPasskeys(await listOperatorPasskeys());
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = () => withBusy(() => registerOperatorPasskey().then());
  const handleRename = (id: string, current: string | null) => {
    const label = window.prompt("通行密钥名称", current ?? "");
    if (label === null) return;
    const trimmed = label.trim();
    if (!trimmed) return;
    void withBusy(() => renameOperatorPasskey(id, trimmed));
  };
  const handleRevoke = (id: string) => {
    if (!window.confirm("确定删除此通行密钥？删除后将无法用它登录。")) return;
    void withBusy(() => revokeOperatorPasskey(id));
  };

  return (
    <section className="vx-passkey-manager">
      <header className="vx-passkey-manager__head">
        <h2>通行密钥（Passkey）</h2>
        <button
          type="button"
          className="vx-auth-primary"
          disabled={busy}
          onClick={handleAdd}
        >
          {busy ? "处理中…" : "添加通行密钥"}
        </button>
      </header>

      {error ? <p className="vx-auth-hint">{error}</p> : null}

      {loading ? (
        <p className="vx-auth-hint">加载中…</p>
      ) : passkeys.length === 0 ? (
        <p className="vx-auth-hint">尚未注册通行密钥。</p>
      ) : (
        <ul className="vx-passkey-list">
          {passkeys.map((p) => (
            <li key={p.id} className="vx-passkey-list__item">
              <div>
                <strong>{p.label ?? "未命名通行密钥"}</strong>
                <span className="vx-auth-hint">
                  添加于 {new Date(p.createdAt).toLocaleDateString()}
                  {p.lastUsedAt
                    ? `，最近使用 ${new Date(p.lastUsedAt).toLocaleDateString()}`
                    : "，尚未使用"}
                </span>
              </div>
              <div className="vx-passkey-list__actions">
                <button
                  type="button"
                  className="vx-auth-link-button"
                  disabled={busy}
                  onClick={() => handleRename(p.id, p.label)}
                >
                  重命名
                </button>
                <button
                  type="button"
                  className="vx-auth-link-button"
                  disabled={busy}
                  onClick={() => handleRevoke(p.id)}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
