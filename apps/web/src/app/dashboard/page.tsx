// Owner: apps/web. Dashboard page with month summary, budgets, and recent activity.
import { AppNav } from "@/components/app-nav";
import { BudgetList } from "@/components/budget-list";
import { DashboardSummary } from "@/components/dashboard-summary";
import { RecentTransactionsTable } from "@/components/recent-transactions-table";
import {
  ApiError,
  filterBudgetsByPeriod,
  getMonthDashboard,
  getTransactions,
  getWeekDashboard,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  try {
    await requireAuthenticatedUser();

    const [monthDashboard, weekDashboard, transactions] = await Promise.all([
      getMonthDashboard(),
      getWeekDashboard(),
      getTransactions(),
    ]);

    const weeklyBudgets = filterBudgetsByPeriod(weekDashboard.budgets, "week");
    const monthlyBudgets = filterBudgetsByPeriod(
      monthDashboard.budgets,
      "month",
    );

    return (
      <div className="min-h-screen">
        <AppNav currentPath="/dashboard" />
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Dashboard</h2>
              <p className="text-sm text-ink-muted">
                Current month and week budget status with recent activity.
              </p>
            </div>
            <p className="text-xs text-ink-muted">
              Month window ends{" "}
              {formatDateTime(monthDashboard.window.end).split(",")[0]}
            </p>
          </section>

          <DashboardSummary
            income={monthDashboard.income}
            expenses={monthDashboard.expenses}
            net={monthDashboard.net}
            currency={monthDashboard.currency}
          />

          <section className="grid gap-4 xl:grid-cols-2">
            <BudgetList title="Weekly budgets" budgets={weeklyBudgets} />
            <BudgetList title="Monthly budgets" budgets={monthlyBudgets} />
          </section>

          <RecentTransactionsTable transactions={transactions} />
        </main>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen">
        <AppNav currentPath="/dashboard" />
        <main className="mx-auto max-w-3xl px-4 py-10">
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
      </div>
    );
  }
}
