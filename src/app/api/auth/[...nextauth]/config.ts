import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/lib/db";
import { comparePassword } from "@/lib/auth";
import { config } from "@/lib/config";
import type { User as AppUser } from "@/types";
import type { Session } from "next-auth";

interface Credentials {
  email?: string;
  password?: string;
}

// Shared authorization logic
async function authorize(credentials: Credentials | undefined) {
  const db = getDb();
  const email = credentials?.email as string;
  const password = credentials?.password as string;

  if (!email || !password) {
    return null;
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as AppUser & { password_hash: string };

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
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials: Credentials | undefined) => {
        return authorize(credentials);
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }: { token: { id?: string }; user?: { id: string } }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: { user?: { id?: string } }; token: { id?: string } }) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      session.user.id = token?.id ? String(token.id) : undefined;
      return session;
    },
  },
  secret: config.auth.secret,
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);