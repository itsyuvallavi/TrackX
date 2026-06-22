// Owner: apps/web. Dashboard page with month summary, budgets, and recent activity.
import { BudgetBoard } from "@/components/budget-board";
import { CommandHeader } from "@/components/command-header";
import { BudgetWatchlist } from "@/components/dashboard/budget-watchlist";
import { CategorySpendList } from "@/components/dashboard/category-spend-list";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { MetricStrip } from "@/components/metric-strip";
import { RecentTransactionsTable } from "@/components/recent-transactions-table";
import { ResponsiveAppShell } from "@/components/responsive-app-shell";
import {
  ApiError,
  filterBudgetsByPeriod,
  getMonthDashboard,
  getRecentTransactions,
  getWeekDashboard,
} from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  await requireAuthenticatedUser();

  try {
    const [monthDashboard, weekDashboard, transactions] = await Promise.all([
      getMonthDashboard(),
      getWeekDashboard(),
      getRecentTransactions(8),
    ]);

    const weeklyBudgets = filterBudgetsByPeriod(weekDashboard.budgets, "week");
    const monthlyBudgets = filterBudgetsByPeriod(
      monthDashboard.budgets,
      "month",
    );
    const attentionBudgets = [...weeklyBudgets, ...monthlyBudgets].filter(
      (budget) => budget.spentAmount > 0 || budget.status !== "ok",
    );
    const hasCategorySpending = monthlyBudgets.some(
      (budget) => budget.spentAmount > 0,
    );
    const hasBudgets = weeklyBudgets.length > 0 || monthlyBudgets.length > 0;

    return (
      <ResponsiveAppShell currentPath="/dashboard">
        <main
          id="main-content"
          className="mx-auto max-w-7xl space-y-5 px-4 py-4 lg:space-y-6 lg:py-6"
        >
          <CommandHeader
            title="Dashboard"
            meta={`Month ends ${formatDateTime(monthDashboard.window.end).split(",")[0]}`}
          />

          <MetricStrip
            income={monthDashboard.income}
            expenses={monthDashboard.expenses}
            weekExpenses={weekDashboard.expenses}
            weeklyBudgets={weeklyBudgets}
            monthlyBudgets={monthlyBudgets}
            currency={monthDashboard.currency}
          />

          {attentionBudgets.length > 0 || hasCategorySpending ? (
            <DashboardGrid>
              {attentionBudgets.length > 0 ? (
                <BudgetWatchlist budgets={attentionBudgets} />
              ) : null}
              {hasCategorySpending ? (
                <CategorySpendList budgets={monthlyBudgets} />
              ) : null}
            </DashboardGrid>
          ) : null}

          <RecentTransactionsTable transactions={transactions} limit={8} />

          {hasBudgets ? (
            <BudgetBoard
              monthlyBudgets={monthlyBudgets}
              weeklyBudgets={weeklyBudgets}
            />
          ) : null}
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
