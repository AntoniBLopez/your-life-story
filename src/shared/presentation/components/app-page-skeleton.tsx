type Variant = "story" | "reflect" | "family" | "generic";

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e8e2d8] ${className ?? ""}`} />;
}

function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Block className="h-3 w-24" />
      <Block className="h-10 w-full max-w-md" />
      <Block className="h-4 w-full max-w-2xl" />
    </div>
  );
}

function StorySkeleton() {
  return (
    <div className="fade-in space-y-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <PageHeaderSkeleton />
        <Block className="h-11 w-40 shrink-0 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <Block className="h-11 w-64" />
        <div className="flex gap-2">
          <Block className="h-10 w-28" />
          <Block className="h-10 w-28" />
        </div>
      </div>
      <div className="space-y-6">
        {[0, 1, 2].map((item) => (
          <div key={item} className="card p-5">
            <Block className="h-3 w-28" />
            <Block className="mt-3 h-8 w-2/3 max-w-sm" />
            <Block className="mt-4 h-16 w-full" />
            <div className="mt-4 flex gap-2">
              <Block className="h-7 w-20 rounded-full" />
              <Block className="h-7 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReflectSkeleton() {
  return (
    <div className="fade-in mx-auto max-w-4xl space-y-8">
      <PageHeaderSkeleton />
      <div className="card overflow-hidden">
        <div className="space-y-4 bg-[#fcfdf9] p-5 sm:p-7">
          <div className="flex justify-start"><Block className="h-16 w-4/5 max-w-md rounded-2xl" /></div>
          <div className="flex justify-end"><Block className="h-12 w-2/5 max-w-xs rounded-2xl" /></div>
          <div className="flex justify-start"><Block className="h-20 w-3/5 max-w-lg rounded-2xl" /></div>
        </div>
        <div className="border-t border-[var(--line)] p-4">
          <Block className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function FamilySkeleton() {
  return (
    <div className="fade-in space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeaderSkeleton />
        <Block className="h-11 w-36 shrink-0 rounded-full" />
      </div>
      <Block className="h-7 w-28 rounded-full" />
      <div className="card family-tree-canvas-card overflow-hidden">
        <Block className="h-[clamp(420px,62vh,680px)] w-full rounded-none" />
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
    default:
      return <GenericSkeleton />;
  }
}
