import { describe, it, expect, vi, beforeEach } from "vitest";

// Set up test environment first
(process.env as any).NODE_ENV = "test";
(process.env as any).NEXTAUTH_SECRET = "test-secret-key-for-testing";

// Mock next-auth
vi.mock("next-auth", () => ({
  __esModule: true,
  default: vi.fn(() => ({ id: "mock-nextauth" })),
}));

// Mock credentials provider - default export
vi.mock("next-auth/providers/credentials", () => {
  const CredentialsProvider = (options: any) => ({
    name: options.name,
    credentials: options.credentials,
    authorize: options.authorize,
  });
  return {
    default: CredentialsProvider,
    __esModule: true,
  };
});

// Mock other dependencies
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  config: {
    auth: {
      secret: "test-secret-key-for-testing",
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  comparePassword: vi.fn().mockResolvedValue(true),
}));

// Import after mocks are set up
describe("NextAuth Configuration", () => {
  describe("authOptions structure", () => {
    it("should be defined after importing config", async () => {
      // Dynamic import after mocks are set up
      const { authOptions } = await import("./config");
      expect(authOptions).toBeDefined();
    });

    it("should have providers array", async () => {
      const { authOptions } = await import("./config");
      expect(authOptions.providers).toBeDefined();
      expect(Array.isArray(authOptions.providers)).toBe(true);
    });

    it("should have credentials provider with name Email", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      expect(provider).toBeDefined();
      expect(provider.name).toBe("Email");
    });

    it("should have pages configuration", async () => {
      const { authOptions } = await import("./config");
      expect(authOptions.pages).toBeDefined();
      expect(authOptions.pages?.signIn).toBe("/login");
      expect(authOptions.pages?.signOut).toBe("/auth/signout");
      expect(authOptions.pages?.error).toBe("/auth/error");
    });

    it("should have callbacks configuration", async () => {
      const { authOptions } = await import("./config");
      expect(authOptions.callbacks).toBeDefined();
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(authOptions.callbacks?.session).toBeDefined();
    });

    it("should have secret from config", async () => {
      const { authOptions } = await import("./config");
      expect(authOptions.secret).toBeDefined();
    });
  });

  describe("Provider configuration", () => {
    it("should have credentials provider with email type", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      const creds = (provider as any).credentials;
      expect(creds?.email).toBeDefined();
      expect(creds?.email.type).toBe("email");
      expect(creds?.password).toBeDefined();
      expect(creds?.password.type).toBe("password");
    });

    it("should have authorize function", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      expect((provider as any).authorize).toBeDefined();
      expect(typeof (provider as any).authorize).toBe("function");
    });
  });

  describe("authOptions validation", () => {
    it("should have debug option", async () => {
      const { authOptions } = await import("./config");
      expect(authOptions.debug).toBeDefined();
    });

    it("should have secret configured", async () => {
      const { authOptions } = await import("./config");
      expect(authOptions.secret).toBeTruthy();
    });

    it("should be a valid AuthOptions-like object", async () => {
      const { authOptions } = await import("./config");

      // Required properties
      expect(authOptions.providers).toBeDefined();
      expect(Array.isArray(authOptions.providers)).toBe(true);

      // Optional but expected
      expect(authOptions.pages).toBeDefined();
      expect(authOptions.callbacks).toBeDefined();
      expect(authOptions.secret).toBeDefined();
    });
  });

  describe("authorize function coverage (lines 17-38 of config.ts)", () => {
    it("should return null when email is missing (line 21-23)", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      const result = await (provider as any).authorize({ password: "test123" });
      expect(result).toBeNull();
    });

    it("should return null when password is missing (line 21-23)", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      const result = await (provider as any).authorize({ email: "test@example.com" });
      expect(result).toBeNull();
    });

    it("should return null when both are missing (line 21-23)", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      const result = await (provider as any).authorize({});
      expect(result).toBeNull();
    });

    it("should return null when user not found in database (line 29-31)", async () => {
      const getDb = (await import("@/lib/db")).getDb;
      (getDb as any).mockReturnValue({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue(null),
        }),
      });

      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      const result = await (provider as any).authorize({ email: "test@example.com", password: "test123" });
      expect(result).toBeNull();
    });

    it("should return null when password is invalid (line 33-36)", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];
      // The comparePassword mock returns true, but we need to test the path where it returns false
      const comparePassword = (await import("@/lib/auth")).comparePassword;
      (comparePassword as any).mockResolvedValueOnce(false);

      const getDb = (await import("@/lib/db")).getDb;
      (getDb as any).mockReturnValue({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({
            id: 1,
            email: "test@example.com",
            name: "Test User",
            password_hash: "hashed",
          }),
        }),
      });

      const result = await (provider as any).authorize({ email: "test@example.com", password: "wrong" });
      expect(result).toBeNull();
    });

    it("should return user object when valid (line 38-43)", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];

      const getDb = (await import("@/lib/db")).getDb;
      (getDb as any).mockReturnValue({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({
            id: 1,
            email: "test@example.com",
            name: "Test User",
            avatar_url: "https://example.com/avatar.png",
            password_hash: "hashed",
          }),
        }),
      });

      const result = await (provider as any).authorize({ email: "test@example.com", password: "test123" });
      expect(result).toBeDefined();
      expect(result.id).toBe("1");
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
      expect(result.image).toBe("https://example.com/avatar.png");
    });

    it("should return null when password_hash is missing (line 31-32)", async () => {
      const { authOptions } = await import("./config");
      const provider = authOptions.providers[0];

      const getDb = (await import("@/lib/db")).getDb;
      (getDb as any).mockReturnValue({
        prepare: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({
            id: 1,
            email: "test@example.com",
            name: "Test User",
          }),
        }),
      });

      const result = await (provider as any).authorize({ email: "test@example.com", password: "test123" });
      expect(result).toBeNull();
    });
  });
});