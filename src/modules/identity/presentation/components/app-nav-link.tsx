"use client";

import Link, { useLinkStatus } from "next/link";
import type { Route } from "next";

export function AppNavLink({
  href,
  title,
  active,
  children,
}: {
  href: string;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      prefetch
      title={title}
      href={href as Route}
      className={`btn btn-quiet !p-2 ${active ? "!bg-[#edf3eb]" : ""}`}
    >
      <AppNavLinkContent>{children}</AppNavLinkContent>
    </Link>
  );
}

function AppNavLinkContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`inline-flex items-center gap-1 transition-opacity ${pending ? "opacity-45" : ""}`}
      aria-busy={pending}
    >
      {children}
    </span>
  );
}
