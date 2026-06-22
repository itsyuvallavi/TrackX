// Owner: apps/web. Dashboard two-column layout for priority panels.
type DashboardGridProps = {
  children: React.ReactNode;
};

export function DashboardGrid({ children }: DashboardGridProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      {children}
    </section>
  );
}
