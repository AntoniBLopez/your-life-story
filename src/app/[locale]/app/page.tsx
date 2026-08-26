import { OnboardingForm } from "@/modules/identity/presentation/components/onboarding-form";
import { StoryDashboard } from "@/modules/life-story/presentation/components/story-dashboard";
import { listLifeEntriesForUser, listLifeEntryLinksForUser } from "@/modules/life-story/application/life-story-service";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { requirePageUser } from "@/shared/lib/auth";

export default async function StoryPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await requirePageUser(locale);
  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) {
    return <OnboardingForm locale={locale} initialName={profile?.displayName ?? user.displayName ?? ""} />;
  }
  const entries = await listLifeEntriesForUser(user.id);
  const links = await listLifeEntryLinksForUser(user.id);
  return <StoryDashboard entries={entries} links={links} locale={locale} displayName={profile.displayName ?? user.displayName ?? undefined} />;
}
