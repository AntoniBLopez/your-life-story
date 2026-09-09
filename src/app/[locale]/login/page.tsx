import { AuthForm } from "@/modules/identity/presentation/components/auth-form";
import { redirectAuthenticatedUser } from "@/shared/lib/auth";

export default async function LoginPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  await redirectAuthenticatedUser(locale);
  return <AuthForm mode="login" locale={locale} />;
}
