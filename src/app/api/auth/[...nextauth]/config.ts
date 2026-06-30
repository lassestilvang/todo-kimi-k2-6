import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import type { User } from "@/types";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

interface Credentials {
  email?: string;
  password?: string;
}

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Credentials | undefined) {
        const db = getDb();
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          return null;
        }

        const user = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as User & { password_hash: string };

        if (!user || !user.password_hash) {
          return null;
        }

        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.avatar_url,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = String(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session.user as { id?: string }).id = String(token.id);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.SECRET || "default-secret-change-in-production",
  debug: process.env.NODE_ENV === "development",
});