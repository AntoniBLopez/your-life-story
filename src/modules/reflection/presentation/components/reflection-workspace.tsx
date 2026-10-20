"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ReflectionConversation } from "../../domain/reflection-conversation";
import { reflectionCopy } from "../../domain/reflection-copy";
import { ReflectionConsentGate } from "./reflection-consent-gate";
import { ReflectionShellProvider } from "./reflection-shell";
import { ReflectionSidebar } from "./reflection-sidebar";

export function ReflectionWorkspace({
  locale,
  consented,
  initialConversations,
  children,
}: {
  locale: "es" | "en";
  consented: boolean;
  initialConversations: ReflectionConversation[];
  children: React.ReactNode;
}) {
  const copy = reflectionCopy(locale);
  const [allowed, setAllowed] = useState(consented);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openSidebar() {
    if (window.matchMedia("(min-width: 768px)").matches) setDesktopOpen((open) => !open);
    else setMobileOpen(true);
  }

  return (
    <div className="fade-in -mb-12 flex h-[calc(100dvh-6.4rem)] min-h-[32rem] flex-col md:-mb-16 md:h-[calc(100dvh-7rem)]">
      <header className="mb-3 shrink-0">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="display mt-1 text-3xl sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-[var(--muted)] sm:block">{copy.intro}</p>
      </header>
      {!allowed ? (
        <ReflectionConsentGate locale={locale} onGranted={() => setAllowed(true)} />
      ) : (
        <ReflectionShellProvider
          initialConversations={initialConversations}
          desktopOpen={desktopOpen}
          mobileOpen={mobileOpen}
          onOpenSidebar={openSidebar}
          onCloseSidebar={() => setMobileOpen(false)}
        >
          <div className="card relative flex min-h-0 flex-1 overflow-hidden">
            {desktopOpen && (
              <div className="hidden w-72 shrink-0 border-r border-[var(--line)] md:block">
                <ReflectionSidebar locale={locale} />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col">{children}</div>
            {mobileOpen && (
              <div className="absolute inset-0 z-20 flex md:hidden">
                <div className="flex h-full w-[min(18rem,86%)] flex-col shadow-xl">
                  <div className="flex justify-end border-b border-[var(--line)] bg-[var(--paper)] px-2 py-1">
                    <button type="button" className="btn btn-quiet !p-2" aria-label={copy.closeSidebar} onClick={() => setMobileOpen(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ReflectionSidebar locale={locale} onNavigate={() => setMobileOpen(false)} />
                  </div>
                </div>
                <button type="button" className="flex-1 bg-[var(--ink)]/40" aria-label={copy.closeSidebar} onClick={() => setMobileOpen(false)} />
              </div>
            )}
          </div>
        </ReflectionShellProvider>
      )}
    </div>
  );
}
