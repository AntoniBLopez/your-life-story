import { AccountSettings } from "@/modules/identity/presentation/components/account-settings";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { requirePageUser } from "@/shared/lib/auth";

export default async function SettingsPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await requirePageUser(locale);
  const [reflection, profile] = await Promise.all([getReflectionState(user.id), getProfile(user.id)]);
  return (
    <AccountSettings
      locale={locale}
      aiConsented={reflection.consented}
      publicArchiveConsent={Boolean(profile?.publicArchiveConsent)}
      archiveSlug={profile?.archiveSlug ?? null}
      published={Boolean(profile?.publishedAt)}
      deceased={Boolean(profile?.deceasedAt)}
      displayName={profile?.displayName ?? user.displayName ?? ""}
      email={user.email}
    />
  );
}
