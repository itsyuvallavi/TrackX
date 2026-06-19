// Owner: apps/web. Server actions for transaction mutations.
"use server";

import { revalidatePath } from "next/cache";
import type { UpdateTransactionInput } from "@trackx/shared";
import { deleteTransaction, updateTransaction } from "./api";

export async function updateTransactionAction(
  id: string,
  input: UpdateTransactionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateTransaction(id, input);
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed.",
    };
  }
}

export async function deleteTransactionAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteTransaction(id);
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Delete failed.",
    };
  }
}
