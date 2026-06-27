"use server";

import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const users = db.prepare("SELECT id, email, name, avatar_url FROM users ORDER BY name, email").all() as Array<{
      id: number;
      email: string;
      name: string | null;
      avatar_url: string | null;
    }>;

    return Response.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return Response.json([], { status: 500 });
  }
}