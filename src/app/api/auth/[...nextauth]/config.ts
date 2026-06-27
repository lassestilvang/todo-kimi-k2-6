import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import type { User } from "@/types";
import type { JWT } from "next-auth/jwt";
import type { Session, Account, Profile } from "next-auth";

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

        // Check for demo mode (no password required)
        if (process.env.AUTH_DEMO_MODE === "true") {
          const user = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(email) as User | null;

          if (user) {
            return {
              id: String(user.id),
              email: user.email,
              name: user.name,
              image: user.avatar_url,
            };
          }

          // Create new demo user
          const result = db
            .prepare("INSERT INTO users (email, name) VALUES (?, ?)")
            .run(email, email.split("@")[0]);

          return {
            id: String(result.lastInsertRowid),
            email,
            name: email.split("@")[0] || null,
            image: null,
          };
        }

        // Production mode: verify password
        const user = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as User & { password_hash: string };

        if (user && user.password_hash && await comparePassword(password, user.password_hash)) {
          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            image: user.avatar_url,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
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
});