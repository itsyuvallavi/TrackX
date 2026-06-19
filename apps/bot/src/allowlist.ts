// Owner: apps/bot. Telegram user allowlist checks for bot access control.
export type AllowlistDecision = {
  allowed: boolean;
  reason: "allowed" | "empty_allowlist" | "not_allowed";
};

export function isTelegramUserAllowed(
  userId: number | string | undefined,
  allowedUserIds: readonly string[],
): AllowlistDecision {
  if (allowedUserIds.length === 0) {
    return { allowed: false, reason: "empty_allowlist" };
  }

  if (userId === undefined) {
    return { allowed: false, reason: "not_allowed" };
  }

  const normalized = String(userId);

  return allowedUserIds.includes(normalized)
    ? { allowed: true, reason: "allowed" }
    : { allowed: false, reason: "not_allowed" };
}

export function deniedMessage(decision: AllowlistDecision): string {
  if (decision.reason === "empty_allowlist") {
    return "TrackX is not configured for Telegram access yet.";
  }

  return "This Telegram account is not allowed to use TrackX.";
}
