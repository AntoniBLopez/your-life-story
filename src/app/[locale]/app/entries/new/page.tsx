import { LifeEntryForm } from "@/modules/life-story/presentation/components/life-entry-form";
import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { requirePageUser } from "@/shared/lib/auth";

export default async function NewEntryPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await requirePageUser(locale);
  const [entries, reflection, profile] = await Promise.all([
    listLifeEntriesForUser(user.id),
    getReflectionState(user.id),
    getProfile(user.id),
  ]);
  return (
    <LifeEntryForm
      locale={locale}
      entries={entries}
      aiConsented={reflection.consented}
      saveVoiceRecordings={profile?.saveVoiceRecordings !== false}
    />
  );
}
