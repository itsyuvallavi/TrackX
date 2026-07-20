// Owner: apps/web. Transactions page with edit and delete actions.
import { CommandHeader } from "@/components/command-header";
import { ResponsiveAppShell } from "@/components/responsive-app-shell";
import { TransactionsTable } from "@/components/transactions-table";
import { ApiError } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadTransactions } from "@/lib/server-page-data";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await requireAuthenticatedUser();

  try {
    const transactions = await loadTransactions(user.id);

    return (
      <ResponsiveAppShell currentPath="/transactions">
        <main
          id="main-content"
          className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-4 sm:py-4 lg:space-y-6 lg:py-6"
        >
          <CommandHeader
            title="Transactions"
            meta={`${transactions.length} records`}
          />

          <TransactionsTable transactions={transactions} />
        </main>
      </ResponsiveAppShell>
    );
  } catch (error) {
    return (
      <ResponsiveAppShell currentPath="/transactions">
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-10">
          <section className="panel panel-body">
            <h2 className="text-lg font-semibold text-ink">
              Transactions unavailable
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {error instanceof ApiError
                ? error.message
                : "Could not load transactions from the API."}
            </p>
          </section>
        </main>
      </ResponsiveAppShell>
    );
  }
}
