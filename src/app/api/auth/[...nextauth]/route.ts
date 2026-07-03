// Custom auth API endpoint for Next.js 16 compatibility
// This replaces the NextAuth [...nextauth] route handler

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-here-change-in-production";

// Warn in development if using default secret
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "development") {
  console.warn("[Auth Warning] NEXTAUTH_SECRET not set. Using default secret for development.");
}

// Never allow default secret in production
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET must be set in production");
}

// Generate JWT token
function generateToken(userId: number, email: string) {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: "30d" });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider");

  if (provider === "credentials") {
    return NextResponse.json({ message: "Use POST to sign in" });
  }

  return NextResponse.json({ message: "Auth endpoint" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = getDb();
    let user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as { id: number; email: string; name: string | null; avatar_url: string | null } | undefined;

    if (!user) {
      // Create user if doesn't exist (demo mode)
      const result = db
        .prepare("INSERT INTO users (email, name, avatar_url) VALUES (?, ?, ?)")
        .run(email, email.split("@")[0], null);
      user = {
        id: result.lastInsertRowid as number,
        email,
        name: email.split("@")[0],
        avatar_url: null,
      };
    }

    const token = generateToken(user.id, user.email);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

// Export for NextAuth compatibility
export const auth = async () => null;
export const signIn = async (_provider: string) => null;
export const signOut = async () => null;
export const handlers = { GET, POST };