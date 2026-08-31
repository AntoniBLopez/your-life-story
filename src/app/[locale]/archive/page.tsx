import { ArchiveIndexPage } from "@/modules/archive/presentation/archive-index-page";
import { listPublishedLives, releaseDueInactivityArchives } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { isMongoConfigured } from "@/shared/lib/env";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  if (!isMongoConfigured()) return <ArchiveIndexPage locale={locale} lives={[]} />;
  try {
    await releaseDueInactivityArchives();
  } catch {
    // A failed sweep must not hide the public archive.
  }
  const lives = await listPublishedLives();
  return <ArchiveIndexPage locale={locale} lives={lives} />;
}
