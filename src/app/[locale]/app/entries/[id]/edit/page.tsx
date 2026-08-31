import { notFound } from "next/navigation";
import { LifeEntryForm } from "@/modules/life-story/presentation/components/life-entry-form";
import { getLifeEntryForUser, getLinkForEntry, listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { requirePageUser } from "@/shared/lib/auth";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { listAttachmentsForEntry } from "@/shared/lib/mongodb/attachments";

export default async function EditEntryPage({ params }: { params: Promise<{ locale: "es" | "en"; id: string }> }) {
  const { locale, id } = await params;
  const user = await requirePageUser(locale);
  const [entry, entries, link, reflection, attachments, profile] = await Promise.all([
    getLifeEntryForUser(user.id, id),
    listLifeEntriesForUser(user.id),
    getLinkForEntry(user.id, id),
    getReflectionState(user.id),
    listAttachmentsForEntry(user.id, id),
    getProfile(user.id),
  ]);
  if (!entry) notFound();
  return (
    <LifeEntryForm
      locale={locale}
      entry={entry}
      entries={entries}
      link={link}
      aiConsented={reflection.consented}
      attachments={attachments}
      saveVoiceRecordings={profile?.saveVoiceRecordings !== false}
    />
  );
}
