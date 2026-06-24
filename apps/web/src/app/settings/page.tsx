// Owner: apps/web. Authenticated settings page for account and integrations.
import { CommandHeader } from "@/components/command-header";
import { ResponsiveAppShell } from "@/components/responsive-app-shell";
import { BudgetLabDemo } from "@/components/settings/budget-lab-demo";
import { TelegramLinkPanel } from "@/components/settings/telegram-link-panel";
import { ApiError } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth";
import { loadBudgets, loadTelegramConnection } from "@/lib/server-page-data";

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();

  try {
    const [budgets, telegramConnection] = await Promise.all([
      loadBudgets(user.id),
      loadTelegramConnection(user.id),
    ]);

    return (
      <ResponsiveAppShell currentPath="/settings">
        <main
          id="main-content"
          className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:space-y-5 sm:px-4 sm:py-4 lg:space-y-6 lg:py-6"
        >
          <CommandHeader title="Settings" />

          <BudgetLabDemo initialBudgets={budgets} />

          <TelegramLinkPanel initialConnection={telegramConnection} />
        </main>
      </ResponsiveAppShell>
    );
  } catch (error) {
    return (
      <ResponsiveAppShell currentPath="/settings">
        <main id="main-content" className="mx-auto max-w-3xl px-4 py-10">
          <section className="panel panel-body">
            <h2 className="text-lg font-semibold text-ink">
              Settings unavailable
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {error instanceof ApiError
                ? error.message
                : "Could not load settings from the API."}
            </p>
          </section>
        </main>
      </ResponsiveAppShell>
    );
  }
}
