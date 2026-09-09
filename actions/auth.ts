"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/password";
import { createVerificationToken, invalidateToken, verifyEmailToken } from "@/lib/verification-token";
import { sendVerificationEmail } from "@/lib/email";
import bcryptjs from "bcryptjs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("Email not verified")) {
        return { error: "Please verify your email before signing in." };
      }
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  try {
    const data = signupSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    // Check password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      return { error: passwordValidation.errors[0] };
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return { error: "Email already registered. Try logging in." };
      }
      // If email exists but not verified, allow resending verification
      await invalidateToken(data.email);
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(data.password, 12);

    // Create or update user
    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { email: data.email },
        data: {
          name: data.name,
          password: hashedPassword,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
        },
      });
    }

    // Generate verification token
    const token = await createVerificationToken(data.email);

    // Send verification email
    const emailResult = await sendVerificationEmail(data.email, token);

    if (!emailResult.success) {
      // Cleanup: delete user if email send failed
      if (!existingUser) {
        await prisma.user.delete({ where: { id: user.id } });
      }
      return { error: "Failed to send verification email. Please try again." };
    }

    return {
      success: true,
      message: "Signup successful! Check your email to verify your account.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { error: firstError.message || "Invalid input" };
    }
    console.error("Signup error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export type VerifyState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function verifyEmail(token: string): Promise<VerifyState> {
  try {
    const { valid, error, user } = await verifyEmailToken(token);

    if (!valid) {
      return { error: error || "Invalid verification token" };
    }

    return {
      success: true,
      message: "Email verified! You can now log in.",
    };
  } catch (error) {
    console.error("Verify email error:", error);
    return { error: "Verification failed. Please try again." };
  }
}

export async function resendVerificationEmail(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  try {
    const email = formData.get("email") as string;

    if (!email) {
      return { error: "Email is required" };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "User not found" };
    }

    if (user.emailVerified) {
      return { error: "Email is already verified" };
    }

    // Invalidate old token
    await invalidateToken(email);

    // Generate new token
    const token = await createVerificationToken(email);

    // Send email
    const emailResult = await sendVerificationEmail(email, token);

    if (!emailResult.success) {
      return { error: "Failed to send email. Please try again." };
    }

    return {
      success: true,
      message: "Verification email sent! Check your inbox.",
    };
  } catch (error) {
    console.error("Resend verification email error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}
