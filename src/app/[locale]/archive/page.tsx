import { ArchiveIndexPage } from "@/modules/archive/presentation/archive-index-page";
import { listPublishedLives, releaseDueInactivityArchives } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { getCurrentUser } from "@/shared/lib/auth";
import { isMongoConfigured } from "@/shared/lib/env";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!isMongoConfigured()) return <ArchiveIndexPage locale={locale} lives={[]} authenticated={Boolean(user)} email={user?.email} />;
  try {
    await releaseDueInactivityArchives();
  } catch {
    // A failed sweep must not hide the public archive.
  }
  const lives = await listPublishedLives();
  return <ArchiveIndexPage locale={locale} lives={lives} authenticated={Boolean(user)} email={user?.email} />;
}
