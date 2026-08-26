import { OnboardingForm } from "@/modules/identity/presentation/components/onboarding-form";
import { StoryDashboard } from "@/modules/life-story/presentation/components/story-dashboard";
import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { requirePageUser } from "@/shared/lib/auth";
import { env } from "@/shared/lib/env";

export default async function StoryPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await requirePageUser(locale);
  if (env.demoMode) {
    const entries = await listLifeEntriesForUser(user.id);
    return <StoryDashboard entries={entries} locale={locale} displayName={user.displayName ?? "Ana Demo"} />;
  }
  const profile = await getProfile(user.id);
  if (!profile?.onboardedAt) {
    return <OnboardingForm locale={locale} initialName={profile?.displayName ?? user.displayName ?? ""} />;
  }
  const entries = await listLifeEntriesForUser(user.id);
  return <StoryDashboard entries={entries} locale={locale} displayName={profile.displayName ?? user.displayName ?? undefined} />;
}
