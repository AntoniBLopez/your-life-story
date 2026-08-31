import { ArchiveIndexPage } from "@/modules/archive/presentation/archive-index-page";
import { listPublishedLives } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { isMongoConfigured } from "@/shared/lib/env";

export const dynamic = "force-dynamic";

export default async function ArchivePage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const lives = isMongoConfigured() ? await listPublishedLives() : [];
  return <ArchiveIndexPage locale={locale} lives={lives} />;
}
