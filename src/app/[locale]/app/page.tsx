import { OnboardingForm } from "@/modules/identity/presentation/components/onboarding-form";
import { StoryDashboard } from "@/modules/life-story/presentation/components/story-dashboard";
import { SharedTimelinesBanner } from "@/modules/family-tree/presentation/components/shared-timelines-banner";
import { listLifeEntriesForUser, listLifeEntryLinksForUser } from "@/modules/life-story/application/life-story-service";
import { listSharedTimelinesForViewer } from "@/modules/family-tree/application/timeline-share-service";
import { getProfile } from "@/modules/identity/infrastructure/mongo-profile-repository";
import { requirePageUser } from "@/shared/lib/auth";

export default async function StoryPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await requirePageUser(locale);
  const profile = await getProfile(user.id);
  const shares = await listSharedTimelinesForViewer(user, locale);
  if (!profile?.onboardedAt) {
    return <OnboardingForm locale={locale} initialName={profile?.displayName ?? user.displayName ?? ""} shares={shares} />;
  }
  const [entries, links] = await Promise.all([
    listLifeEntriesForUser(user.id),
    listLifeEntryLinksForUser(user.id),
  ]);
  return (
    <>
      <SharedTimelinesBanner locale={locale} shares={shares} />
      <StoryDashboard entries={entries} links={links} locale={locale} displayName={profile.displayName ?? user.displayName ?? undefined} />
    </>
  );
}
