"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export async function createUser(input: z.infer<typeof createUserSchema>) {
  await requireAdmin();
  const data = createUserSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
  });

  revalidatePath("/admin/users");
  return { id: user.id, email: user.email };
}

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export async function resetPassword(
  userId: string,
  input: z.infer<typeof resetPasswordSchema>
) {
  await requireAdmin();
  const data = resetPasswordSchema.parse(input);
  const hashedPassword = await bcrypt.hash(data.password, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  revalidatePath("/admin/users");
}

export async function deactivateUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("You cannot deactivate your own account.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: false },
  });

  revalidatePath("/admin/users");
}

export async function reactivateUser(userId: string) {
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { active: true },
  });

  revalidatePath("/admin/users");
}

const setAvatarUrlSchema = z.object({
  avatarUrl: z.string().trim().url("Enter a valid image URL").or(z.literal("")),
});

export async function setAvatarUrl(userId: string, input: z.infer<typeof setAvatarUrlSchema>) {
  await requireAdmin();
  const data = setAvatarUrlSchema.parse(input);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: data.avatarUrl || null },
  });

  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("You cannot delete your own account.");
  }

  await prisma.prediction.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
}
