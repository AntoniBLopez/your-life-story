import { AuthForm } from "@/modules/identity/presentation/components/auth-form";

export default async function RegisterPage({ params }: { params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  return <AuthForm mode="register" locale={locale} />;
}
