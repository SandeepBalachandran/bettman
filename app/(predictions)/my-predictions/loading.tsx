import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <Skeleton className="h-7 w-32 rounded-full" />
          {Array.from({ length: 2 }).map((_, rowIndex) => (
            <div key={rowIndex} className="space-y-2 rounded-2xl bg-secondary/5 p-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
