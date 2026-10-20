function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--sage)] ${className ?? ""}`} />;
}

export function ReflectionPaneSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-3">
        <Block className="h-9 w-9 rounded-full" />
        <Block className="h-4 w-40" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-4 bg-[var(--cream)] p-5">
        <div className="flex justify-start"><Block className="h-16 w-4/5 max-w-md rounded-2xl" /></div>
        <div className="flex justify-end"><Block className="h-12 w-2/5 max-w-xs rounded-2xl" /></div>
      </div>
      <div className="border-t border-[var(--line)] p-4">
        <div className="flex gap-3">
          <Block className="h-12 flex-1" />
          <Block className="h-12 w-24 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
