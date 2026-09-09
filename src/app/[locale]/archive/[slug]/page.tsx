import { notFound } from "next/navigation";
import { ArchiveProfilePage } from "@/modules/archive/presentation/archive-profile-page";
import { findPublishedProfileBySlug } from "@/modules/archive/infrastructure/mongo-archive-repository";
import { getCurrentUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function ArchiveLifePage({ params }: { params: Promise<{ locale: "es" | "en"; slug: string }> }) {
  const { locale, slug } = await params;
  const user = await getCurrentUser();
  const life = await findPublishedProfileBySlug(slug);
  if (!life) notFound();
  return (
    <ArchiveProfilePage
      locale={locale}
      authenticated={Boolean(user)}
      email={user?.email}
      slug={life.slug}
      displayName={life.displayName}
      deceasedAt={life.deceasedAt}
      publishedAt={life.publishedAt}
      entries={life.entries}
      links={life.links}
      people={life.family.people}
      relationships={life.family.relationships}
      attachments={life.attachments}
    />
  );
}
