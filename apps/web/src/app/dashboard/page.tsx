// Owner: apps/web. Dashboard page with month summary, budgets, and recent activity.
import { CommandHeader } from "@/components/command-header";
import { DashboardBudgetPulse } from "@/components/dashboard/dashboard-budget-pulse";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { RecentTransactionsTable } from "@/components/recent-transactions-table";
import { ResponsiveAppShell } from "@/components/responsive-app-shell";
import { ApiError, filterBudgetsByPeriod } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadDashboardData } from "@/lib/server-page-data";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();

  try {
    const { monthDashboard, weekDashboard, transactions } =
      await loadDashboardData(user.id);

    const weeklyBudgets = filterBudgetsByPeriod(weekDashboard.budgets, "week");
    const monthlyBudgets = filterBudgetsByPeriod(
      monthDashboard.budgets,
      "month",
    );

    return (
      <ResponsiveAppShell currentPath="/dashboard">
        <main
          id="main-content"
          className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-4 sm:py-4 lg:space-y-6 lg:py-6"
        >
          <CommandHeader
            title="Dashboard"
            meta={`Month ends ${formatDateTime(monthDashboard.window.end).split(",")[0]}`}
          />

          <DashboardSummary
            weekExpenses={weekDashboard.expenses}
            monthExpenses={monthDashboard.expenses}
            income={monthDashboard.income}
            weeklyBudgets={weeklyBudgets}
            currency={monthDashboard.currency}
          />

          <DashboardBudgetPulse
            weeklyBudgets={weeklyBudgets}
            monthlyBudgets={monthlyBudgets}
          />

          <RecentTransactionsTable transactions={transactions} limit={5} />
        </main>
      </ResponsiveAppShell>
    );
  } catch (error) {
    return (
      <ResponsiveAppShell currentPath="/dashboard">
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-10">
          <section className="panel panel-body">
            <h2 className="text-lg font-semibold text-ink">
              Dashboard unavailable
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {error instanceof ApiError
                ? error.message
                : "Could not load dashboard data from the API."}
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Start the API with <code className="font-mono">pnpm api:dev</code>{" "}
              or run the full stack, then refresh this page.
            </p>
          </section>
        </main>
      </ResponsiveAppShell>
    );
  }
}
