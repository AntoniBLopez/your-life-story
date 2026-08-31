import { AdminPanel } from "@/modules/archive/presentation/admin-panel";
import { listPublicationRequests, searchUsersForAdmin } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { requireAdminPage } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);
  const [requests, users] = await Promise.all([
    listPublicationRequests("pending"),
    searchUsersForAdmin(""),
  ]);
  return <AdminPanel locale={locale} requests={requests} initialUsers={users} />;
}
