import { getAdminCatalogBooks } from "../../lib/bookCatalog";
import { getAdminActiveLoans } from "../../lib/adminLoans";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [initialBooks, initialLoans] = await Promise.all([
    getAdminCatalogBooks(),
    getAdminActiveLoans(),
  ]);

  return <AdminDashboard initialBooks={initialBooks} initialLoans={initialLoans} />;
}
