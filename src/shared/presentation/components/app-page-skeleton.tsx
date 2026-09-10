type Variant =
  | "story"
  | "reflect"
  | "family"
  | "settings"
  | "search"
  | "admin"
  | "entry"
  | "shared"
  | "archive"
  | "archive-profile"
  | "generic";

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e8e2d8] ${className ?? ""}`} />;
}

function PageHeaderSkeleton({ introLines = 1 }: { introLines?: number }) {
  return (
    <div className="space-y-3">
      <Block className="h-3 w-24" />
      <Block className="h-10 w-full max-w-md sm:h-12" />
      {Array.from({ length: introLines }, (_, index) => (
        <Block key={index} className={`h-4 w-full ${index === introLines - 1 ? "max-w-2xl" : "max-w-xl"}`} />
      ))}
    </div>
  );
}

function BackLinkSkeleton() {
  return <Block className="h-4 w-28 rounded-lg" />;
}

function ViewTabsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-[#eef2ec] p-1">
      {Array.from({ length: count }, (_, index) => (
        <Block key={index} className={`h-10 rounded-lg ${index === 0 ? "w-36" : "w-28"}`} />
      ))}
    </div>
  );
}

function TimelineEntriesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="timeline">
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="timeline-item">
          <Block className="timeline-dot !rounded-full" />
          <div className="card p-5">
            <Block className="h-3 w-24" />
            <Block className="mt-3 h-8 w-2/3 max-w-sm" />
            <Block className="mt-4 h-16 w-full" />
            <div className="mt-4 flex gap-2">
              <Block className="h-7 w-20 rounded-full" />
              <Block className="h-7 w-24 rounded-full" />
            </div>
            <Block className="mt-4 h-14 w-full rounded-xl" />
          </div>
        </article>
      ))}
    </div>
  );
}

function StorySkeleton() {
  return (
    <div className="fade-in">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <PageHeaderSkeleton />
        <Block className="h-11 w-44 shrink-0 rounded-full" />
      </div>
      <div className="mt-8 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center">
        <ViewTabsSkeleton />
        <div className="flex flex-wrap items-center gap-2">
          <Block className="h-4 w-4 rounded" />
          <Block className="h-9 w-36" />
          <Block className="h-9 w-36" />
          <Block className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="mt-2">
        <TimelineEntriesSkeleton />
      </div>
      <div className="card mt-8 flex items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <Block className="h-3 w-40" />
          <Block className="h-7 w-full max-w-sm" />
        </div>
        <Block className="h-11 w-11 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function ReflectSkeleton() {
  return (
    <div className="fade-in mx-auto max-w-4xl">
      <PageHeaderSkeleton introLines={2} />
      <div className="card mt-8 overflow-hidden">
        <div className="space-y-4 bg-[#fcfdf9] p-5 sm:p-7">
          <div className="flex justify-start">
            <Block className="h-16 w-4/5 max-w-md rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Block className="h-12 w-2/5 max-w-xs rounded-2xl" />
          </div>
          <div className="flex justify-start">
            <Block className="h-20 w-3/5 max-w-lg rounded-2xl" />
          </div>
        </div>
        <div className="border-t border-[var(--line)] p-4">
          <div className="flex gap-3">
            <Block className="h-12 flex-1" />
            <Block className="h-12 w-24 shrink-0 rounded-full" />
          </div>
          <Block className="mt-2 h-3 w-4/5 max-w-md" />
        </div>
      </div>
    </div>
  );
}

function FamilySkeleton() {
  return (
    <div className="fade-in">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeaderSkeleton introLines={2} />
        <div className="flex flex-wrap gap-2">
          <Block className="h-11 w-36 rounded-full" />
          <Block className="h-11 w-36 rounded-full" />
        </div>
      </div>
      <div className="card family-tree-canvas-card mt-8 overflow-hidden">
        <Block className="h-[clamp(420px,62vh,680px)] w-full rounded-none" />
      </div>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="fade-in">
      <PageHeaderSkeleton />
      <div className="mt-6 flex max-w-2xl gap-2">
        <Block className="h-11 flex-1" />
        <Block className="h-11 w-28 shrink-0 rounded-full" />
      </div>
      <section className="mt-8">
        <Block className="h-8 w-40" />
        <div className="mt-3 grid gap-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Block className="h-5 w-48 max-w-full" />
                <Block className="h-3 w-24" />
              </div>
              <Block className="mt-3 h-4 w-full" />
              <Block className="mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="fade-in mx-auto max-w-5xl">
      <PageHeaderSkeleton introLines={2} />
      <section className="mt-8">
        <Block className="h-8 w-36" />
        <div className="card mt-4 p-6">
          <Block className="h-5 w-56 max-w-full" />
          <Block className="mt-3 h-4 w-full" />
          <Block className="mt-2 h-4 w-4/5" />
          <div className="mt-5 flex flex-wrap gap-2">
            <Block className="h-10 w-44 rounded-full" />
            <Block className="h-10 w-28 rounded-full" />
          </div>
        </div>
      </section>
      <section className="mt-8">
        <Block className="h-8 w-28" />
        <Block className="mt-4 h-11 w-full max-w-md" />
        <div className="mt-4 space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Block className="h-5 w-48 max-w-full" />
                  <Block className="h-4 w-56 max-w-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Block className="h-9 w-24 rounded-full" />
                  <Block className="h-9 w-28 rounded-full" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Block className="h-6 w-28 rounded-full" />
                <Block className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="fade-in mx-auto max-w-3xl">
      <BackLinkSkeleton />
      <div className="mt-6">
        <PageHeaderSkeleton introLines={2} />
      </div>
      <div className="card mt-8 flex flex-col gap-8 p-5 sm:p-7">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-2">
            <Block className="h-3 w-28" />
            <Block className={`w-full ${item === 0 ? "h-12" : "h-11"}`} />
          </div>
        ))}
        <div className="rounded-2xl border border-[var(--line)] p-4">
          <Block className="h-4 w-40" />
          <Block className="mt-3 h-10 w-full max-w-xs rounded-full" />
        </div>
        <div className="space-y-2">
          <Block className="h-3 w-32" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <Block key={item} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Block className="h-11 w-36 rounded-full" />
          <Block className="h-11 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SharedSkeleton() {
  return (
    <div className="fade-in">
      <BackLinkSkeleton />
      <div className="mt-6">
        <PageHeaderSkeleton introLines={2} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Block className="h-11 w-56 rounded-full" />
        <Block className="h-11 w-40 rounded-full" />
      </div>
      <div className="mt-8">
        <ViewTabsSkeleton />
      </div>
      <div className="mt-2">
        <TimelineEntriesSkeleton count={2} />
      </div>
    </div>
  );
}

function ArchiveSkeleton() {
  return (
    <section className="fade-in pb-8 pt-2 sm:pt-4">
      <div className="mx-auto max-w-2xl text-center">
        <Block className="mx-auto h-10 w-full max-w-md" />
        <Block className="mx-auto mt-3 h-4 w-full max-w-xl" />
        <Block className="mx-auto mt-2 h-4 w-4/5 max-w-lg" />
      </div>
      <div className="mx-auto mt-7 max-w-xl">
        <Block className="h-12 w-full rounded-full" />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Block className="h-8 w-20 rounded-full" />
          <Block className="h-8 w-24 rounded-full" />
          <Block className="h-8 w-28 rounded-full" />
        </div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="card p-5 sm:p-6">
            <Block className="h-7 w-3/4 max-w-full" />
            <Block className="mt-3 h-3 w-24" />
            <Block className="mt-4 h-4 w-full" />
            <Block className="mt-2 h-4 w-5/6" />
            <div className="mt-5 flex gap-2">
              <Block className="h-6 w-20 rounded-full" />
              <Block className="h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ArchiveProfileSkeleton() {
  return (
    <article className="fade-in pb-20 pt-2 sm:pt-4">
      <BackLinkSkeleton />
      <Block className="mt-6 h-3 w-28" />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl space-y-3">
          <Block className="h-14 w-full max-w-lg sm:h-16" />
          <Block className="h-4 w-32" />
          <Block className="h-4 w-full max-w-2xl" />
          <Block className="h-4 w-11/12 max-w-xl" />
        </div>
        <Block className="h-8 w-28 rounded-full" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="card p-4">
            <Block className="h-3 w-20" />
            <Block className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-8">
        <ViewTabsSkeleton />
      </div>
      <div className="mt-2">
        <TimelineEntriesSkeleton count={2} />
      </div>
    </article>
  );
}

function SettingsSectionSkeleton({
  action = "button",
  danger = false,
  titleWidth = "w-44",
}: {
  action?: "button" | "checkbox" | "form" | "danger";
  danger?: boolean;
  titleWidth?: string;
}) {
  return (
    <section className={`card p-6 ${danger ? "border-[#edcfcb]" : ""}`}>
      <Block className="h-[21px] w-[21px] rounded-md" />
      <Block className={`mt-3 h-8 max-w-full ${titleWidth}`} />
      <Block className="mt-2 h-4 w-full" />
      <Block className="mt-2 h-4 w-11/12" />
      {action === "button" && <Block className="mt-5 h-11 w-56 max-w-full rounded-full" />}
      {action === "checkbox" && (
        <div className="mt-5 flex items-start gap-3">
          <Block className="mt-1 h-4 w-4 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <Block className="h-4 w-48 max-w-full" />
            <Block className="h-4 w-full" />
          </div>
        </div>
      )}
      {action === "form" && (
        <div className="mt-5 grid gap-4">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="space-y-2">
              <Block className="h-3 w-28" />
              <Block className="h-11 w-full" />
            </div>
          ))}
          <Block className="h-11 w-40 rounded-full" />
        </div>
      )}
      {action === "danger" && (
        <div className="mt-5 space-y-4">
          <Block className="h-11 w-full max-w-sm" />
          <Block className="h-11 w-44 rounded-full" />
        </div>
      )}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="fade-in mx-auto max-w-3xl">
      <PageHeaderSkeleton />
      <div className="mt-8 space-y-5">
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton />
        <section className="card p-6">
          <Block className="h-[21px] w-[21px] rounded-md" />
          <Block className="mt-3 h-8 w-56 max-w-full" />
          <Block className="mt-2 h-4 w-full" />
          <Block className="mt-2 h-4 w-10/12" />
          <div className="mt-5 flex items-center gap-3">
            <Block className="h-4 w-4 rounded" />
            <Block className="h-4 w-52 max-w-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Block className="h-3 w-32" />
            <Block className="h-11 w-full max-w-xs" />
          </div>
          <Block className="mt-4 h-11 w-36 rounded-full" />
          <Block className="mt-4 h-4 w-4/5 max-w-md" />
          <Block className="mt-2 h-4 w-full" />
        </section>
        <SettingsSectionSkeleton action="form" />
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton action="checkbox" />
        <SettingsSectionSkeleton />
        <SettingsSectionSkeleton danger action="danger" titleWidth="w-40" />
      </div>
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className="fade-in space-y-6">
      <PageHeaderSkeleton />
      <div className="card p-6">
        <Block className="h-4 w-full" />
        <Block className="mt-3 h-4 w-5/6" />
        <Block className="mt-3 h-4 w-2/3" />
      </div>
    </div>
  );
}

export function AppPageSkeleton({ variant = "generic" }: { variant?: Variant }) {
  switch (variant) {
    case "story":
      return <StorySkeleton />;
    case "reflect":
      return <ReflectSkeleton />;
    case "family":
      return <FamilySkeleton />;
    case "settings":
      return <SettingsSkeleton />;
    case "search":
      return <SearchSkeleton />;
    case "admin":
      return <AdminSkeleton />;
    case "entry":
      return <EntrySkeleton />;
    case "shared":
      return <SharedSkeleton />;
    case "archive":
      return <ArchiveSkeleton />;
    case "archive-profile":
      return <ArchiveProfileSkeleton />;
    default:
      return <GenericSkeleton />;
  }
}
