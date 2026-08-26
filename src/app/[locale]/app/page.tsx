import { redirect } from "next/navigation";
import { OnboardingForm } from "@/modules/identity/presentation/components/onboarding-form";
import { StoryDashboard } from "@/modules/life-story/presentation/components/story-dashboard";
import { listLifeEntriesForUser } from "@/modules/life-story/application/life-story-service";
import { requirePageUser } from "@/shared/lib/auth";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { env } from "@/shared/lib/env";

export default async function StoryPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  const user = await requirePageUser(locale);
  if (env.demoMode) {
    const entries = await listLifeEntriesForUser(user.id);
    return <StoryDashboard entries={entries} locale={locale} displayName={user.user_metadata?.display_name ?? "Ana Demo"} />;
  }
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("display_name,onboarded_at").eq("id", user.id).maybeSingle();
  if (!profile?.onboarded_at) return <OnboardingForm locale={locale} initialName={profile?.display_name ?? user.user_metadata?.display_name ?? ""} />;
  const entries = await listLifeEntriesForUser(user.id);
  return <StoryDashboard entries={entries} locale={locale} displayName={profile.display_name ?? undefined} />;
}
