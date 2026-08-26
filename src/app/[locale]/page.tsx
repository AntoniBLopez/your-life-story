import { LandingPage } from "@/modules/marketing/presentation/landing-page";

export default async function LocalizedLandingPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  return <LandingPage locale={locale} />;
}
