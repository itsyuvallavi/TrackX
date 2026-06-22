// Owner: apps/web. Responsive app frame with desktop and mobile navigation.
import { AppNav, appLinks } from "./app-nav";
import { MobileTabBar } from "./mobile-tab-bar";

type ResponsiveAppShellProps = {
  children: React.ReactNode;
  currentPath: string;
};

export function ResponsiveAppShell({
  children,
  currentPath,
}: ResponsiveAppShellProps) {
  return (
    <div className="min-h-screen bg-surface-muted pb-20 sm:pb-24 lg:pb-0">
      <AppNav currentPath={currentPath} />
      {children}
      <MobileTabBar currentPath={currentPath} links={appLinks} />
    </div>
  );
}
