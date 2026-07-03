import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:space-y-10 sm:p-6">
      <Skeleton className="h-8 w-32" />
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <Skeleton className="h-7 w-36 rounded-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <div key={cardIndex} className="space-y-3 rounded-2xl bg-accent/5 p-4">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-8 rounded-full" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
