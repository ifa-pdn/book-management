import { getAdminCatalogBooks } from "../../../../lib/bookCatalog";
import { getAdminActiveLoans } from "../../../../lib/adminLoans";
import LoanStationPage from "./LoanStationPage";

export const dynamic = "force-dynamic";

export default async function AdminLoanStationRoute({
  searchParams,
}: {
  searchParams: Promise<{
    copy?: string | string[];
    mode?: string | string[];
  }>;
}) {
  const [initialBooks, initialActiveLoans] = await Promise.all([
    getAdminCatalogBooks(),
    getAdminActiveLoans(),
  ]);
  const params = await searchParams;
  const copyParam = Array.isArray(params.copy) ? params.copy[0] : params.copy;
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;

  return (
    <LoanStationPage
      initialBooks={initialBooks}
      initialActiveLoans={initialActiveLoans}
      initialCopyCode={copyParam ?? ""}
      initialMode={modeParam === "return" ? "return" : "loan"}
    />
  );
}
