import { notFound } from "next/navigation";
import { requirePageUser } from "@/shared/lib/auth";
import { getSharedTimelineForViewer } from "@/modules/family-tree/application/timeline-share-service";
import { SharedTimelinePage } from "@/modules/family-tree/presentation/components/shared-timeline-page";

export const dynamic = "force-dynamic";

export default async function SharedFamilyTimelineRoute({
  params,
}: {
  params: Promise<{ locale: "es" | "en"; ownerId: string }>;
}) {
  const { locale, ownerId } = await params;
  const user = await requirePageUser(locale);
  const shared = await getSharedTimelineForViewer(ownerId, user, locale);
  if (!shared) notFound();
  return <SharedTimelinePage locale={locale} shared={shared} />;
}
