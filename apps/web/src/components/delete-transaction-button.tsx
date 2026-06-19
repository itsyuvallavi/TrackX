// Owner: apps/web. Delete transaction action with confirmation.
"use client";

import { useTransition } from "react";
import { deleteTransactionAction } from "@/lib/actions";

type DeleteTransactionButtonProps = {
  transactionId: string;
  description: string;
};

export function DeleteTransactionButton({
  transactionId,
  description,
}: DeleteTransactionButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${description}"? This cannot be undone from the dashboard.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTransactionAction(transactionId);

      if (!result.ok) {
        window.alert(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      className="btn-danger disabled:opacity-60"
      disabled={pending}
      onClick={handleDelete}
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
