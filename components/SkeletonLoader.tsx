"use client";

export function SkeletonLine({
  width = "w-full",
  height = "h-4",
  className = "",
}: {
  readonly width?: string;
  readonly height?: string;
  readonly className?: string;
}) {
  return (
    <div
      className={`${width} ${height} rounded bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
    />
  );
}

export function SkeletonButton({
  className = "",
}: {
  readonly className?: string;
}) {
  return (
    <div className={`w-full h-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`} />
  );
}

export function SkeletonCard({
  children,
  className = "",
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`card rounded-2xl p-6 w-full max-w-md space-y-6 ${className}`}>
      {children}
    </div>
  );
}
