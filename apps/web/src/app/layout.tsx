// Owner: apps/web. Root layout and global styles for the TrackX dashboard.
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "TrackX Dashboard",
  description: "Review budgets and transactions for TrackX.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
