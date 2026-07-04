import { describe, it, expect } from "vitest";
import { migrations } from "@/lib/db/migrations";

describe("Migrations", () => {
  it("should have defined migrations", () => {
    expect(Object.keys(migrations).length).toBeGreaterThan(0);
  });

  it("should have sequential migration IDs", () => {
    const ids = Object.keys(migrations).map(Number).sort((a, b) => a - b);
    const expectedIds = ids.slice().sort((a, b) => a - b);
    expect(ids).toEqual(expectedIds);
  });

  it("should have valid SQL for each migration", () => {
    for (const [id, sql] of Object.entries(migrations)) {
      expect(sql).toBeTruthy();
      expect(sql.length).toBeGreaterThan(10);
      // Should contain CREATE TABLE, ALTER TABLE, or CREATE INDEX
      expect(sql.toUpperCase()).toMatch(/(CREATE TABLE|ALTER TABLE|CREATE INDEX)/);
    }
  });
});