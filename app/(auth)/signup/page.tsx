"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "@/actions/auth";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Eye, EyeOff } from "lucide-react";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (formDataObj: FormData) => {
    formAction(formDataObj);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        action={handleSubmit}
        className="card w-full max-w-sm space-y-4 p-6 shadow-2xl"
      >
        <LoadingOverlay show={pending} label="Creating account..." />
        <div className="text-center">
          <span className="text-3xl">🏆</span>
          <h1 className="text-xl font-bold gradient-text">Create Account</h1>
          <p className="text-xs text-gray-500">Bettman</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
            className="input-pill w-full"
          />
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
              placeholder="At least 8 characters"
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
          <p className="text-xs text-gray-500">
            Must contain uppercase, lowercase, and number
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className="input-pill w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {state.error && (
          <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="rounded-lg bg-success/10 p-3 text-sm text-success" role="status">
            {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || state.success}
          className="gradient-header btn w-full py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create Account"}
        </button>

        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
