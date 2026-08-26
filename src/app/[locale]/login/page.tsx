import { AuthForm } from "@/modules/identity/presentation/components/auth-form";

export default async function LoginPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  return <AuthForm mode="login" locale={locale} />;
}
