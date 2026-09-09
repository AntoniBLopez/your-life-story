import { LandingPage } from "@/modules/marketing/presentation/landing-page";
import { redirectAuthenticatedUser } from "@/shared/lib/auth";

export default async function LocalizedLandingPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  await redirectAuthenticatedUser(locale);
  return <LandingPage locale={locale} />;
}
