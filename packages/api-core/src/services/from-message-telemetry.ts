// Owner: packages/api-core. Telemetry helpers for message ingestion flows.
export function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}

export function compactMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}
