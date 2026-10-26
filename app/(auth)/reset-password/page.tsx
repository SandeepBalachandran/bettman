"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { resetPassword, type ResetPasswordState } from "@/actions/password-reset";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { BrandLogo } from "@/components/BrandLogo";

const initialState: ResetPasswordState = {};

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="gradient-text">Password updated</h1>
        <p className="text-sm text-gray-400">You can now sign in with your new password.</p>
        <Link href="/login" className="btn btn-primary h-11 w-full text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="gradient-text">Link not valid</h1>
        <p className="text-sm text-gray-400">
          This reset link is missing its code. Open the link from your email again, or request a new one.
        </p>
        <Link href="/forgot-password" className="btn btn-primary h-11 w-full text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <LoadingOverlay show={pending} label="Saving new password..." />
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1 text-center">
        <h1 className="gradient-text">New password</h1>
        <p className="text-sm text-gray-400">Choose a new password for your account.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="input-pill w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-gray-500">Must contain uppercase, lowercase, and number</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          placeholder="Type it again"
          className="input-pill w-full"
        />
      </div>

      {state.error && (
        <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
          {state.error}
          {state.error.includes("expired") && (
            <p className="mt-1 text-xs">
              <Link href="/forgot-password" className="underline hover:no-underline">
                Request a new link
              </Link>
            </p>
          )}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary h-11 w-full text-sm">
        {pending ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="card relative w-full max-w-sm space-y-5 p-6 shadow-2xl">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
