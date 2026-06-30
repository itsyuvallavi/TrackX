// Owner: apps/web. Apple Wallet Shortcut import token panel.
"use client";

import { useMemo, useState } from "react";

type ShortcutTokenStatus = {
  connected: boolean;
  tokenPreview: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
};

type ShortcutImportPanelProps = {
  initialStatus: ShortcutTokenStatus;
};

type TokenCreateResponse = {
  token: string;
  tokenPreview: string;
  createdAt: string;
};

const ENDPOINT = "/api/imports/apple-wallet";

export function ShortcutImportPanel({
  initialStatus,
}: ShortcutImportPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fullEndpoint = useAbsoluteEndpoint();

  async function createToken() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/settings/shortcut-token", {
        method: "POST",
      });
      const body = (await response.json()) as
        | TokenCreateResponse
        | { error: string };

      if (!response.ok || !("token" in body)) {
        throw new Error("error" in body ? body.error : "Could not create.");
      }

      setToken(body.token);
      setStatus({
        connected: true,
        tokenPreview: body.tokenPreview,
        lastUsedAt: null,
        createdAt: body.createdAt,
      });
      setMessage("Token created. Copy it now; it will not be shown again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/settings/shortcut-token", {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not disconnect.");
      }

      setToken(null);
      setStatus({
        connected: false,
        tokenPreview: null,
        lastUsedAt: null,
        createdAt: null,
      });
      setMessage("Shortcut token revoked.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not disconnect.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copied.`);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Apple Wallet</h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            Import Wallet transactions from iOS Shortcuts.
          </p>
        </div>
        <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold text-accent-dark">
          {status.connected ? "Ready" : "Not set"}
        </span>
      </div>

      <div className="panel-body space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Endpoint
            </p>
            <button
              className="mt-2 block w-full truncate text-left text-sm font-semibold text-accent-dark"
              type="button"
              onClick={() => copy(fullEndpoint, "Endpoint")}
            >
              {fullEndpoint}
            </button>
          </div>
          <div className="rounded-3xl bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Token
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {status.tokenPreview ?? "Create one first"}
            </p>
          </div>
        </div>

        {token ? (
          <div className="rounded-3xl border border-accent bg-accent-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
              Copy into Authorization
            </p>
            <p className="mt-3 select-all break-all rounded-2xl bg-surface px-4 py-3 font-mono text-sm font-semibold text-ink">
              Bearer {token}
            </p>
            <button
              className="btn-secondary mt-3 min-h-10"
              type="button"
              onClick={() => copy(`Bearer ${token}`, "Authorization header")}
            >
              Copy header
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="btn-primary min-h-11"
            type="button"
            disabled={busy}
            onClick={createToken}
          >
            {busy
              ? "Working..."
              : status.connected
                ? "Rotate token"
                : "Create token"}
          </button>
          {status.connected ? (
            <button
              className="btn-secondary min-h-11"
              type="button"
              disabled={busy}
              onClick={revokeToken}
            >
              Disconnect
            </button>
          ) : null}
        </div>

        <p className="text-xs font-medium text-ink-muted">
          Last used {formatDate(status.lastUsedAt)}.
        </p>

        {message ? (
          <p className="rounded-2xl bg-success-muted px-4 py-3 text-sm font-semibold text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-2xl bg-danger-muted px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function useAbsoluteEndpoint(): string {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return ENDPOINT;
    }

    return `${window.location.origin}${ENDPOINT}`;
  }, []);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
