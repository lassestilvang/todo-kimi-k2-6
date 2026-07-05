import { getCurrentUser } from "@/lib/actions/auth";

describe("Auth Utilities", () => {
  test("should export getCurrentUser function", () => {
    expect(typeof getCurrentUser).toBe("function");
  });

  test("should have correct function signature", () => {
    expect(getCurrentUser.length).toBe(0);
  });
});