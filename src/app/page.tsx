import PublicCatalogClient from "./PublicCatalogClient";
import { getPublicCatalogBooks } from "../lib/bookCatalog";
import { getCurrentRole } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function PublicCatalogPage() {
  const [initialBooks, currentRole] = await Promise.all([
    getPublicCatalogBooks(),
    getCurrentRole(),
  ]);

  return (
    <PublicCatalogClient
      initialBooks={initialBooks}
      currentRole={currentRole}
    />
  );
}
