"use server";

import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const db = getDb();

    // Check if user already exists
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return Response.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = db
      .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
      .run(email, name, passwordHash);

    return Response.json(
      { message: "User created successfully", userId: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
