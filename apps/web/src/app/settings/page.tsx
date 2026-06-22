// Owner: apps/web. Authenticated settings page for account and integrations.
import { CommandHeader } from "@/components/command-header";
import { ResponsiveAppShell } from "@/components/responsive-app-shell";
import { BudgetPlanner } from "@/components/settings/budget-planner";
import { getBudgets } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAuthenticatedUser();
  const budgets = await getBudgets();

  return (
    <ResponsiveAppShell currentPath="/settings">
      <main
        id="main-content"
        className="mx-auto max-w-3xl space-y-5 px-4 py-4 lg:space-y-6 lg:py-6"
      >
        <CommandHeader title="Settings" />

        <BudgetPlanner initialBudgets={budgets} />

        <section className="panel overflow-hidden">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-ink">Telegram</h2>
          </div>
          <div className="panel-body space-y-3">
            <p className="text-sm leading-6 text-ink-muted">
              Telegram is the main input for TrackX. Send expenses or income to
              your connected bot, then review them in Dashboard and
              Transactions.
            </p>
            <div className="rounded-3xl bg-accent-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
                Example
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                spent 4.50 euro on coffee
              </p>
            </div>
          </div>
        </section>
      </main>
    </ResponsiveAppShell>
  );
}
