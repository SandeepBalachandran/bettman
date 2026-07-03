"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUser } from "@/actions/user";
import { LoadingOverlay } from "@/components/LoadingOverlay";

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
    <form
      onSubmit={handleSubmit}
      className="card flex flex-col flex-wrap items-stretch gap-3 p-4 sm:flex-row sm:items-end"
    >
      <LoadingOverlay show={isPending} label="Creating player..." />
      <div className="flex-1">
        <label htmlFor="new-user-name" className="block text-xs text-gray-500">
          Name
        </label>
        <input
          id="new-user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="input-pill w-full"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="new-user-email" className="block text-xs text-gray-500">
          Email
        </label>
        <input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input-pill w-full"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="new-user-password" className="block text-xs text-gray-500">
          Password
        </label>
        <input
          id="new-user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="input-pill w-full"
        />
      </div>
      <button type="submit" disabled={isPending} className="btn btn-primary">
        {isPending ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
