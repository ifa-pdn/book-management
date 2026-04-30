"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import styles from "./AppShell.module.css";

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/add");
  const isLoanStationRoute = pathname.startsWith("/admin/loans/station");
  const isCompactRoute =
    pathname === "/login" ||
    pathname.startsWith("/copy/") ||
    isLoanStationRoute;

  return (
    <div className={styles.appContainer}>
      {isAdminRoute && !isLoanStationRoute ? <Sidebar /> : null}
      <main
        className={`${styles.mainContent} ${
          isCompactRoute ? styles.mainContentFlush : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
