"use server";

import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if user already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: number } | undefined;

    if (existingUser) {
      return Response.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = db
      .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
      .run(email, name || null, passwordHash);

    const user = {
      id: result.lastInsertRowid,
      email,
      name: name || email.split("@")[0],
    };

    return Response.json(user);
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}