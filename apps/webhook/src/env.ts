// Owner: apps/webhook. Cloudflare Worker environment bindings.
export type WebhookEnv = {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ALLOWED_USER_IDS: string;
  API_BASE_URL: string;
  TRACKX_API_SECRET: string;
  DEFAULT_TIMEZONE: string;
  DEFAULT_CURRENCY: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
};

export function parseAllowedUserIds(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
