import { CategoriesClient } from "@/components/categories/CategoriesClient";
import { AppShell } from "@/components/layout/AppShell";
import { listCategories } from "@/lib/data";
import { requirePagePermission } from "@/lib/page-auth";

export default async function CategoriesPage() {
  const user = await requirePagePermission("inventory:read");
  const categories = await listCategories(undefined, true, user.business_id);

  return (
    <AppShell active="Categories" title="Categories" user={user}>
      <CategoriesClient categories={categories} />
    </AppShell>
  );
}
