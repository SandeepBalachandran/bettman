"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="btn btn-primary"
      >
        Try again
      </button>
    </main>
  );
}
