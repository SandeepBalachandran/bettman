import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl bg-accent/5 p-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    </main>
  );
}
