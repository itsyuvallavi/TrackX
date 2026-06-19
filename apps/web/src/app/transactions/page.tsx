// Owner: apps/web. Transactions page with edit and delete actions.
import { AppNav } from "@/components/app-nav";
import { TransactionsTable } from "@/components/transactions-table";
import { ApiError, getTransactions } from "@/lib/api";

export default async function TransactionsPage() {
  try {
    const transactions = await getTransactions();

    return (
      <div className="min-h-screen">
        <AppNav currentPath="/transactions" />
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section>
            <h2 className="text-xl font-semibold text-ink">Transactions</h2>
            <p className="text-sm text-ink-muted">
              Review, edit categories, and delete incorrect entries.
            </p>
          </section>

          <TransactionsTable transactions={transactions} />
        </main>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen">
        <AppNav currentPath="/transactions" />
        <main className="mx-auto max-w-3xl px-4 py-10">
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
      </div>
    );
  }
}
