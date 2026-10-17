import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Workspace Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@wafilow.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // 1. Look up user in Neon PostgreSQL
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name || normalizedEmail.split("@")[0],
          email: user.email,
          image: user.image,
          role: user.role,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "wafilow-saas-production-session-secret-key",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string | null }).organizationId;
        token.picture = user.image || null;
      }
      if (trigger === "update" && session) {
        if (session.image !== undefined) token.picture = session.image;
        if (session.name !== undefined) token.name = session.name;
      }
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { organizationId: true, role: true, image: true, name: true },
          });
          if (dbUser) {
            if (dbUser.organizationId) token.organizationId = dbUser.organizationId;
            if (dbUser.role) token.role = dbUser.role;
            if (dbUser.image !== undefined) token.picture = dbUser.image;
            if (dbUser.name) token.name = dbUser.name;
          }
        } catch {
          // Graceful fallback
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = (token.organizationId as string | null) || null;
        session.user.image = (token.picture as string | null) || null;
        if (token.name) {
          session.user.name = token.name as string;
        }
      }
      return session;
    },
  },
};

