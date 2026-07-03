import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-2xl bg-accent/5 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-full" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </main>
  );
}
