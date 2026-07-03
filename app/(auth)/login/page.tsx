"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";
import { LoadingOverlay } from "@/components/LoadingOverlay";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="gradient-header flex min-h-screen items-center justify-center p-4">
      <form
        action={formAction}
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
            className="input-pill w-full"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input-pill w-full"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remember" />
          Remember me
        </label>

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="gradient-header btn w-full py-2.5 text-sm font-semibold text-white"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
