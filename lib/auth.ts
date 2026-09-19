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
        if (!credentials?.email) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // 1. Look up user in Neon PostgreSQL
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // 2. Provision initial user if first login
        if (!user) {
          let org = await prisma.organization.findFirst();
          if (!org) {
            org = await prisma.organization.create({
              data: {
                name: "Default Organization",
              },
            });
          }

          const hashedPassword = credentials.password
            ? await bcrypt.hash(credentials.password, 10)
            : null;

          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: normalizedEmail.split("@")[0] || "Admin",
              password: hashedPassword,
              role: "admin",
              organizationId: org.id,
            },
          });
        } else if (credentials.password && user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            return null;
          }
        }

        return {
          id: user.id,
          name: user.name || "Admin",
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

