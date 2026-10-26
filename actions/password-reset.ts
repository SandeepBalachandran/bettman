"use server";

import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
/** Don't send another reset email to the same account within this window. */
const RESEND_COOLDOWN_MS = 60 * 1000;

/** Only the hash is stored, so a leaked database can't be used to reset passwords. */
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

const GENERIC_SENT = { success: true } as const;

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: "Please enter a valid email address." };
  }
  const email = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  // Same response whether or not the account exists, so this form can't be
  // used to find out who has an account.
  if (!user || !user.active) {
    return GENERIC_SENT;
  }

  // A token issued less than a minute ago is still fresh — don't spam the inbox.
  if (user.resetTokenExpires && user.resetTokenExpires.getTime() - RESET_TOKEN_TTL_MS > Date.now() - RESEND_COOLDOWN_MS) {
    return GENERIC_SENT;
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashToken(token),
      resetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const result = await sendPasswordResetEmail(user.email, token);
  if (!result.success) {
    return { error: "We couldn't send the reset email. Please try again in a moment." };
  }

  return GENERIC_SENT;
}

export type ResetPasswordState = {
  error?: string;
  success?: boolean;
};

const resetSchema = z
  .object({
    token: z.string().min(1, "This reset link is invalid."),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
  });

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const strength = validatePasswordStrength(parsed.data.password);
  if (!strength.valid) {
    return { error: strength.errors[0] };
  }

  const user = await prisma.user.findFirst({
    where: { resetToken: hashToken(parsed.data.token) },
  });
  if (!user || !user.active || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcryptjs.hash(parsed.data.password, 12),
      resetToken: null,
      resetTokenExpires: null,
      // Opening the emailed link proves they own the address.
      emailVerified: user.emailVerified ?? new Date(),
      verificationToken: null,
      verificationTokenExpires: null,
    },
  });

  return { success: true };
}
