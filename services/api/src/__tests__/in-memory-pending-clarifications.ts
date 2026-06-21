// Owner: services/api. In-memory pending clarification repository for API tests.
import type {
  PendingClarificationRecord,
  PendingClarificationRepository,
  PendingClarificationScope,
  SavePendingClarificationInput,
} from "../repositories/pending-clarifications.js";

export function createInMemoryPendingClarificationRepository(
  records: PendingClarificationRecord[],
): PendingClarificationRepository {
  async function resolveActive(
    scope: PendingClarificationScope,
  ): Promise<void> {
    for (const record of records) {
      if (matchesScope(record, scope) && record.status === "active") {
        record.status = "resolved";
        record.resolvedAt = new Date().toISOString();
      }
    }
  }

  return {
    async findActive(scope) {
      return (
        records.find(
          (record) =>
            matchesScope(record, scope) &&
            record.status === "active" &&
            new Date(record.expiresAt) > new Date(),
        ) ?? null
      );
    },
    resolveActive,
    async saveActive(input) {
      await resolveActive(input);
      records.push(toPendingClarification(input));
    },
  };
}

function matchesScope(
  record: PendingClarificationRecord,
  scope: PendingClarificationScope,
): boolean {
  return (
    record.userId === scope.userId &&
    record.telegramUserId === (scope.telegramUserId ?? null)
  );
}

function toPendingClarification(
  input: SavePendingClarificationInput,
): PendingClarificationRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    telegramUserId: input.telegramUserId ?? null,
    originalMessage: input.originalMessage,
    clarifyingQuestion: input.clarifyingQuestion,
    status: "active",
    expiresAt: input.expiresAt.toISOString(),
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
