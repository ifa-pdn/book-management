import { getAdminLoanHistory } from "../../../../lib/adminLoans";
import LoanHistoryPage from "./LoanHistoryPage";

export const dynamic = "force-dynamic";

export default async function AdminLoanHistoryRoute() {
  const initialLoans = await getAdminLoanHistory();

  return <LoanHistoryPage initialLoans={initialLoans} />;
}
