import { getAdminCatalogBooks } from "../../lib/bookCatalog";
import { getAdminActiveLoans } from "../../lib/adminLoans";
import { getTopBorrowedBooks } from "../../lib/loanReports";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [initialBooks, initialLoans, initialTopBorrowedBooks] = await Promise.all([
    getAdminCatalogBooks(),
    getAdminActiveLoans(),
    getTopBorrowedBooks({ period: "30d", limit: 10 }),
  ]);

  return (
    <AdminDashboard
      initialBooks={initialBooks}
      initialLoans={initialLoans}
      initialTopBorrowedBooks={initialTopBorrowedBooks}
    />
  );
}
