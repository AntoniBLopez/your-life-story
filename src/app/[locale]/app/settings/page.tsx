import { AccountSettings } from "@/modules/identity/presentation/components/account-settings";
import { getReflectionState } from "@/modules/reflection/application/reflection-service";
import { requirePageUser } from "@/shared/lib/auth";

export default async function SettingsPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params; const user = await requirePageUser(locale);
  const reflection = await getReflectionState(user.id);
  return <AccountSettings locale={locale} aiConsented={reflection.consented} />;
}
