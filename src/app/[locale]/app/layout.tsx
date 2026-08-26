import { AppHeader } from "@/modules/identity/presentation/components/app-header";
import { requirePageUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: "es" | "en" }> }) {
  const { locale } = await params;
  await requirePageUser(locale);
  return <div className="app-shell"><AppHeader locale={locale} /><main className="app-content">{children}</main></div>;
}
