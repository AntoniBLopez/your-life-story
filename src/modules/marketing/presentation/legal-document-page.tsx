import Link from "next/link";
import { Sprout } from "lucide-react";

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export function LegalDocumentPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <main className="page-shell min-h-screen">
      <header className="border-b border-[var(--line)] bg-[#fffdf9e8] backdrop-blur-md">
        <div className="container flex min-h-[4.25rem] items-center justify-between gap-4 py-4">
          <Link href="/es" className="flex items-center gap-2 font-bold">
            <span className="brand-mark"><Sprout size={15} /></span>
            <span className="display text-lg">Your Life Story</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[var(--muted)]">
            <Link href="/legal/privacy" className="hover:text-[var(--moss-deep)]">Privacy</Link>
            <Link href="/legal/tos" className="hover:text-[var(--moss-deep)]">Terms</Link>
            <Link href="/es/login" className="hover:text-[var(--moss-deep)]">Sign in</Link>
          </nav>
        </div>
      </header>

      <article className="container max-w-3xl py-12 sm:py-16">
        <p className="eyebrow">Legal</p>
        <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Last updated: {updated}</p>
        <p className="mt-6 text-base leading-7 text-[var(--muted)]">{intro}</p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="display text-2xl text-[var(--ink)]">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--muted)]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>

      <footer className="border-t border-[var(--line)] bg-[#fffdf9b8] py-8">
        <div className="container flex flex-col gap-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Your Life Story</p>
          <div className="flex flex-wrap gap-4 font-semibold">
            <Link href="/legal/privacy">Privacy Policy</Link>
            <Link href="/legal/tos">Terms of Service</Link>
            <Link href="/es">Home</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
