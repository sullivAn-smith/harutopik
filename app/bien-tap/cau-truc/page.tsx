import { CatalogStructureManager } from "@/features/admin/catalog-structure-manager";
import { getCatalogStructureOptions } from "@/lib/data/admin";

export default async function EditorCatalogStructurePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const [entries, query] = await Promise.all([
    getCatalogStructureOptions(),
    searchParams,
  ]);
  return (
    <CatalogStructureManager
      entries={entries}
      query={query}
      returnTo="/bien-tap/cau-truc"
    />
  );
}
