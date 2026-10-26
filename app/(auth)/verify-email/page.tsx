"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/actions/auth";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    const verify = async () => {
      const result = await verifyEmail(token);

      if (result.success) {
        setStatus("success");
        setMessage(result.message || "Email verified successfully!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(result.error || "Verification failed. Please try again.");
      }
    };

    verify();
  }, [token, router]);

  return (
    <>
      {status === "loading" && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin text-3xl">⏳</div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verifying your email...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="text-4xl">✅</div>
          <p className="text-sm text-success font-medium">{message}</p>
          <p className="text-xs text-gray-500">
            Redirecting you to login in a moment...
          </p>
          <Link
            href="/login"
            className="inline-block gradient-header btn px-6 py-2 text-sm font-semibold text-white"
          >
            Go to Login
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="text-4xl">❌</div>
          <p className="text-sm text-danger font-medium">{message}</p>
          <div className="space-y-2">
            <Link
              href="/signup"
              className="inline-block gradient-header btn px-6 py-2 text-sm font-semibold text-white"
            >
              Try Again
            </Link>
            <p className="text-xs text-gray-500">
              or{" "}
              <Link href="/login" className="text-accent hover:underline">
                go to login
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card w-full max-w-sm space-y-6 p-6 shadow-2xl text-center">
        <div>
          <span className="text-4xl">🏆</span>
          <h1 className="text-xl font-bold gradient-text mt-2">Email Verification</h1>
        </div>

        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin text-3xl">⏳</div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verifying your email...
              </p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </main>
  );
}
