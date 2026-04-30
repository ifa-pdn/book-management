import { getAdminActiveLoans } from "../../../lib/adminLoans";
import { getAdminCatalogBooks } from "../../../lib/bookCatalog";
import LoanManagementPage from "./LoanManagementPage";

export const dynamic = "force-dynamic";

export default async function AdminLoansPage() {
  const [initialBooks, initialLoans] = await Promise.all([
    getAdminCatalogBooks(),
    getAdminActiveLoans(),
  ]);

  return (
    <LoanManagementPage
      initialBooks={initialBooks}
      initialLoans={initialLoans}
    />
  );
}
