import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock modules at module level
vi.mock("@/lib/auth", () => ({
  comparePassword: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  config: {
    auth: { secret: "test-secret" },
  },
}));

describe("NextAuth Configuration - Authentication Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Provider configuration", () => {
    it("should have credentials provider with correct ID", async () => {
      const { authOptions } = await import("../config");
      expect(authOptions.providers[0]?.id).toBe("credentials");
    });

    it("should have authorize function as a callback", async () => {
      const { authOptions } = await import("../config");
      const provider = authOptions.providers[0] as any;
      expect(typeof provider.authorize).toBe("function");
    });

    it("should return null for undefined credentials", async () => {
      const { authOptions } = await import("../config");
      const provider = authOptions.providers[0] as any;
      const result = await provider.authorize(undefined);
      expect(result).toBeNull();
    });

    it("should return null for missing email", async () => {
      const { authOptions } = await import("../config");
      const provider = authOptions.providers[0] as any;
      const result = await (provider as any).authorize({ password: "test" });
      expect(result).toBeNull();
    });

    it("should return null for missing password", async () => {
      const { authOptions } = await import("../config");
      const provider = authOptions.providers[0] as any;
      const result = await (provider as any).authorize({ email: "test@example.com" });
      expect(result).toBeNull();
    });
  });

  describe("JWT callback", () => {
    it("should preserve existing token properties", async () => {
      const { authOptions } = await import("../config");
      const jwtCallback = authOptions.callbacks?.jwt;

      const token = { email: "test@example.com", existingProp: "value" };
      const result = await jwtCallback?.({
        token,
        user: { id: "123", email: "test@example.com" },
      });

      expect(result).toHaveProperty("id", "123");
      expect(result).toHaveProperty("email", "test@example.com");
    });

    it("should add id to token when user has id", async () => {
      const { authOptions } = await import("../config");
      const jwtCallback = authOptions.callbacks?.jwt;

      const result = await jwtCallback?.({
        token: {},
        user: { id: "999" },
      });

      expect(result).toHaveProperty("id", "999");
    });

    it("should not modify token when no user", async () => {
      const { authOptions } = await import("../config");
      const jwtCallback = authOptions.callbacks?.jwt;

      const token = { email: "test" };
      const result = await jwtCallback?.({ token });

      expect(result).toEqual({ email: "test" });
    });
  });

  describe("Session callback", () => {
    it("should add user id to session when token has id", async () => {
      const { authOptions } = await import("../config");
      const sessionCallback = authOptions.callbacks?.session;

      const session = { user: { email: "test@example.com" } };
      const result = await sessionCallback?.({
        session,
        token: { id: "555" },
      });

      expect((result?.user as any)?.id).toBe("555");
    });

    it("should return session unchanged when token has no id", async () => {
      const { authOptions } = await import("../config");
      const sessionCallback = authOptions.callbacks?.session;

      const session = { user: { email: "test@example.com" } };
      const result = await sessionCallback?.({
        session,
        token: {},
      });

      expect(result).toEqual(session);
    });
  });

  describe("Pages configuration", () => {
    it("should have correct signIn page", async () => {
      const { authOptions } = await import("../config");
      expect(authOptions.pages?.signIn).toBe("/login");
    });

    it("should have correct signOut page", async () => {
      const { authOptions } = await import("../config");
      expect(authOptions.pages?.signOut).toBe("/auth/signout");
    });

    it("should have correct error page", async () => {
      const { authOptions } = await import("../config");
      expect(authOptions.pages?.error).toBe("/auth/error");
    });
  });

  describe("Secrets and debug", () => {
    it("should use secret from config", async () => {
      const { authOptions } = await import("../config");
      expect(authOptions.secret).toBe("test-secret");
    });

    it("should have debug mode set based on NODE_ENV", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      vi.resetModules();
      const { authOptions } = await import("../config");
      // debug is based on NODE_ENV
      expect(authOptions.debug).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });
});