// Owner: apps/web. Telegram connection panel for authenticated settings.
"use client";

import { useMemo, useState } from "react";

type TelegramConnection = {
  connected: boolean;
  telegramUserId: string | null;
};

type TelegramLinkPanelProps = {
  initialConnection: TelegramConnection;
};

type LinkCodeResponse = {
  code: string;
  expiresAt: string;
};

export function TelegramLinkPanel({
  initialConnection,
}: TelegramLinkPanelProps) {
  const [connection, setConnection] = useState(initialConnection);
  const [linkCode, setLinkCode] = useState<LinkCodeResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const command = linkCode ? `/link ${linkCode.code}` : null;
  const safeTelegramId = useMemo(
    () => maskTelegramId(connection.telegramUserId),
    [connection.telegramUserId],
  );

  async function refreshStatus() {
    const response = await fetch("/api/telegram/status");
    const body = (await response.json()) as
      | TelegramConnection
      | { error: string };

    if (!response.ok) {
      throw new Error("error" in body ? body.error : "Could not refresh.");
    }

    setConnection(body as TelegramConnection);
  }

  async function createLinkCode() {
    setBusy(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/telegram/link-code", {
        method: "POST",
      });
      const body = (await response.json()) as
        | LinkCodeResponse
        | {
            error: string;
          };

      if (!response.ok) {
        throw new Error(
          "error" in body ? body.error : "Could not create code.",
        );
      }

      await refreshStatus();
      setLinkCode(body as LinkCodeResponse);
      setStatus("Code ready. Send it to the bot before it expires.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyCommand() {
    if (!command) {
      return;
    }

    await navigator.clipboard.writeText(command);
    setStatus("Command copied.");
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Telegram</h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            Connect the bot to this account.
          </p>
        </div>
        <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold text-accent-dark">
          {connection.connected ? "Connected" : "Not connected"}
        </span>
      </div>
      <div className="panel-body space-y-4">
        {connection.connected ? (
          <div className="rounded-3xl bg-success-muted p-4">
            <p className="text-sm font-semibold text-success">
              Telegram is connected.
            </p>
            {safeTelegramId ? (
              <p className="mt-1 text-sm text-ink-muted">
                Telegram ID {safeTelegramId}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-ink-muted">
              Create a code, then send it to the TrackX bot from Telegram.
            </p>
            <button
              className="btn-primary min-h-11 w-full sm:w-auto"
              type="button"
              disabled={busy}
              onClick={createLinkCode}
            >
              {busy ? "Creating..." : "Create link code"}
            </button>
          </div>
        )}

        {command ? (
          <div className="rounded-3xl border border-accent bg-accent-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
              Send to Telegram
            </p>
            <p className="mt-3 select-all rounded-2xl bg-surface px-4 py-3 font-mono text-lg font-semibold text-ink">
              {command}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                className="btn-secondary min-h-10"
                type="button"
                onClick={copyCommand}
              >
                Copy command
              </button>
              <a
                className="btn-secondary min-h-10 text-center"
                href="https://t.me/TrackX_yuvalbot"
                target="_blank"
                rel="noreferrer"
              >
                Open Telegram
              </a>
            </div>
            <p className="mt-3 text-xs font-medium text-ink-muted">
              Expires {formatExpiry(linkCode?.expiresAt)}.
            </p>
          </div>
        ) : null}

        {status ? (
          <p className="rounded-2xl bg-success-muted px-4 py-3 text-sm font-semibold text-success">
            {status}
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

function maskTelegramId(telegramUserId: string | null): string | null {
  if (!telegramUserId) {
    return null;
  }

  return `...${telegramUserId.slice(-4)}`;
}

function formatExpiry(expiresAt: string | undefined): string {
  if (!expiresAt) {
    return "soon";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(expiresAt));
}
