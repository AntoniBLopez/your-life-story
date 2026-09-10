import { AppHeader } from "@/modules/identity/presentation/components/app-header";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-chrome";

export function ArchivePageLayout({
  locale,
  authenticated = false,
  email,
  children,
}: {
  locale: "es" | "en";
  authenticated?: boolean;
  email?: string | null;
  children: React.ReactNode;
}) {
  if (authenticated) {
    return (
      <div className="app-shell">
        <AppHeader locale={locale} email={email} showSearch={false} />
        <main className="app-content">{children}</main>
        <PublicSiteFooter locale={locale} authenticated />
      </div>
    );
  }

  return (
    <main className="page-shell">
      <PublicSiteHeader locale={locale} current="archive" />
      {children}
      <PublicSiteFooter locale={locale} />
    </main>
  );
}
