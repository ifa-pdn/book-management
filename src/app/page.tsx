import PublicCatalogClient from "./PublicCatalogClient";
import { getPublicCatalogBooks } from "../lib/bookCatalog";
import { isAdminSession } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage() {
  const [initialBooks, isAdmin] = await Promise.all([
    getPublicCatalogBooks(),
    isAdminSession(),
  ]);

  return <PublicCatalogClient initialBooks={initialBooks} isAdmin={isAdmin} />;
}
