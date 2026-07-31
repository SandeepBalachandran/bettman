"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, signInWithGoogle, type LoginState } from "@/actions/auth";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Eye, EyeOff } from "lucide-react";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (formDataObj: FormData) => {
    formAction(formDataObj);
  };

  return (
    <main className="gradient-header flex min-h-screen items-center justify-center p-4">
      <form
        action={handleSubmit}
        className="card w-full max-w-sm space-y-4 p-6 shadow-2xl"
      >
        <LoadingOverlay show={pending} label="Signing in..." />
        <div className="text-center">
          <span className="text-3xl">🏆</span>
          <h1 className="text-xl font-bold gradient-text">Sign in</h1>
          <p className="text-xs text-gray-500">Bettman</p>
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
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="input-pill w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              className="input-pill w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remember" />
          Remember me
        </label>

        {state.error && (
          <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
            {state.error}
            {state.error.includes("Email not verified") && (
              <p className="text-xs mt-1">
                Check your inbox for the verification link, or{" "}
                <Link href="/signup" className="underline hover:no-underline">
                  try signing up again
                </Link>
                .
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="gradient-header btn w-full py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          or
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="btn w-full flex items-center justify-center gap-2 border border-gray-300 py-2.5 text-sm font-medium dark:border-gray-700"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
          </svg>
          Continue with Google
        </button>

        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-accent hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
