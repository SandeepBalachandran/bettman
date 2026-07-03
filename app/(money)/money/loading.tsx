import { Skeleton } from "@/components/Skeleton";

export default function MoneyLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Financial Summary Skeleton */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl bg-accent/5 p-4 sm:grid-cols-3">
        <div className="text-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mx-auto mt-2 h-8 w-20" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mx-auto mt-2 h-8 w-20" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mx-auto mt-2 h-8 w-20" />
        </div>
      </div>

      {/* Stats Skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-accent/5 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Pending Exposure Skeleton */}
      <div className="rounded-2xl bg-highlight/10 p-4">
        <Skeleton className="h-6 w-40" />
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-1 h-6 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Match History Skeleton */}
      <div>
        <Skeleton className="h-6 w-48" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
