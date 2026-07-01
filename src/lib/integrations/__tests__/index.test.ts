import { describe, it, expect } from "vitest";

// Simple test for module existence
describe("integrations module", () => {
  it("should export integration functions", async () => {
    const module = await import("@/lib/integrations/index");
    expect(module.sendSlackNotification).toBeDefined();
    expect(module.sendDiscordNotification).toBeDefined();
    expect(module.sendEmailNotification).toBeDefined();
  });
});