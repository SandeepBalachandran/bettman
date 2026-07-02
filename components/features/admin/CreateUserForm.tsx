"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUser } from "@/actions/user";

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await createUser({ name, email, password, role: "USER" });
        toast.success(`User ${email} created`);
        setName("");
        setEmail("");
        setPassword("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create user.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-wrap items-stretch gap-2 rounded border p-4 sm:flex-row sm:items-end">
      <div>
        <label className="block text-xs text-gray-500">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded border px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded border px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent px-3 py-1.5 text-sm text-accent-foreground disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
