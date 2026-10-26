"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotPasswordState } from "@/actions/password-reset";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { BrandLogo } from "@/components/BrandLogo";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card relative w-full max-w-sm space-y-5 p-6 shadow-2xl">
        <LoadingOverlay show={pending} label="Sending reset link..." />
        <div className="flex justify-center">
          <BrandLogo />
        </div>

        {state.success ? (
          <div className="space-y-4 text-center">
            <h1 className="gradient-text">Check your inbox</h1>
            <p className="text-sm leading-relaxed text-gray-400">
              If an account exists for that email, we&apos;ve sent a link to reset your password. It
              expires in 1 hour. Don&apos;t see it? Check your spam folder.
            </p>
            <Link href="/login" className="btn btn-primary h-11 w-full text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1 text-center">
              <h1 className="gradient-text">Forgot password?</h1>
              <p className="text-sm text-gray-400">
                Enter your email and we&apos;ll send you a link to choose a new one.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="input-pill w-full"
              />
            </div>

            {state.error && (
              <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full text-sm">
              {pending ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Remembered it?{" "}
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
