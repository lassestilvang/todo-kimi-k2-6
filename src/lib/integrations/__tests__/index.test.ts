import { describe, it, expect } from "vitest";

// Simple test for module existence
describe("integrations module", () => {
  it("should export integration functions", async () => {
    const integrations = await import("@/lib/integrations/index");
    expect(integrations.sendSlackNotification).toBeDefined();
    expect(integrations.sendDiscordNotification).toBeDefined();
    expect(integrations.sendEmailNotification).toBeDefined();
  });
});