import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || !user.password) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Email not verified");
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      if (account?.provider !== "google") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      // No PrismaAdapter is wired up (JWT-only sessions), so Google sign-in
      // is linked to our User table by email here: match an existing account
      // (created via credentials signup or a prior Google sign-in) or create
      // a new one. Google has already verified the email, so we can skip our
      // own verification-token flow for these accounts.
      const dbUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          name: user.name || user.email,
          email: user.email,
          password: null,
          avatarUrl: user.image ?? null,
          emailVerified: new Date(),
        },
      });

      if (!dbUser.active) {
        return false;
      }

      user.id = dbUser.id;
      user.role = dbUser.role;
      user.avatarUrl = dbUser.avatarUrl;
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
        // Fetch fresh so admin-set avatar changes show up without re-login.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { avatarUrl: true },
        });
        session.user.avatarUrl = dbUser?.avatarUrl ?? null;
      }
      return session;
    },
  },
});
