import { AppHeader } from "@/modules/identity/presentation/components/app-header";
import { parseAppLocale } from "@/i18n/routing";
import { requirePageUser } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = parseAppLocale((await params).locale);
  const user = await requirePageUser(locale);
  return <div className="app-shell"><AppHeader locale={locale} email={user.email} /><main className="app-content">{children}</main></div>;
}
