import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../calendar/status/route";
import { NextRequest } from "next/server";

describe("Calendar Status API", () => {
  const mockGetCalendarSync = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock("@/lib/actions/calendar", () => ({
      getCalendarSync: mockGetCalendarSync,
    }));
  });

  it("should return connected status when calendar is synced", async () => {
    mockGetCalendarSync.mockResolvedValue({
      provider: "google",
      access_token: "test-token",
      refresh_token: "test-refresh",
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      enabled: true,
      created_at: new Date().toISOString(),
    });

    const request = new NextRequest("http://localhost/api/calendar/status");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
    expect(data.provider).toBe("google");
  });

  it("should return disconnected status when no calendar sync", async () => {
    mockGetCalendarSync.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/calendar/status");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
    expect(data.provider).toBeNull();
  });

  it("should handle errors gracefully", async () => {
    mockGetCalendarSync.mockRejectedValue(new Error("Database error"));

    const request = new NextRequest("http://localhost/api/calendar/status");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
    expect(data.error).toBeUndefined();
  });
});