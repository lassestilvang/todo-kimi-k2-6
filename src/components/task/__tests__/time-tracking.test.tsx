import { describe, it, expect } from 'vitest';

// Test the time tracking component logic
describe("TimeTracking - Time Formatting", () => {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  it("should format 1 hour correctly", () => {
    expect(formatDuration(3600)).toBe("1h 0m 0s");
  });

  it("should format 1 hour 1 minute 1 second correctly", () => {
    expect(formatDuration(3661)).toBe("1h 1m 1s");
  });

  it("should handle zero seconds", () => {
    expect(formatDuration(0)).toBe("0h 0m 0s");
  });

  it("should handle large durations", () => {
    expect(formatDuration(7325)).toBe("2h 2m 5s");
  });
});