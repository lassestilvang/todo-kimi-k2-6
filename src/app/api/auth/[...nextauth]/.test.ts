import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authOptions } from "./config";
import { getDb } from "@/lib/db";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  comparePassword: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  config: {
    auth: {
      secret: "test-secret-key-for-testing",
    },
  },
}));

// Mock NextAuth
vi.mock("next-auth", () => ({
  __esModule: true,
  default: vi.fn(),
}));

// Mock credentials provider
vi.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  CredentialsProvider: vi.fn((options: any) => ({
    name: options.name,
    credentials: options.credentials,
    authorize: options.authorize,
  })),
}));

describe("NextAuth Configuration", () => {
  const mockDb: any = {
    prepare: vi.fn(),
  };

  const mockComparePassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as any).mockReturnValue(mockDb);
    (require("@/lib/auth").comparePassword as any).mockImplementation(mockComparePassword);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("authOptions configuration", () => {
    it("should export authOptions object", () => {
      expect(authOptions).toBeDefined();
    });

    it("should have providers array", () => {
      expect(authOptions.providers).toBeDefined();
      expect(Array.isArray(authOptions.providers)).toBe(true);
    });

    it("should have credentials provider configured", () => {
      const credentialsProvider = authOptions.providers[0];
      expect(credentialsProvider).toBeDefined();
      expect(credentialsProvider.name).toBe("Email");
    });

    it("should configure credentials correctly", () => {
      const credentialsProvider = authOptions.providers[0];
      expect(credentialsProvider.credentials).toEqual({
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      });
    });
  });

  describe("authorize function", () => {
    it("should return null when credentials are missing email", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({ password: "testpass" } as any);
      expect(result).toBeNull();
    });

    it("should return null when credentials are missing password", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({ email: "test@example.com" } as any);
      expect(result).toBeNull();
    });

    it("should return null when user is not found", async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      });

      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "notfound@example.com",
        password: "password123",
      } as any);
      expect(result).toBeNull();
    });

    it("should return null when password is invalid", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        avatar_url: "https://example.com/avatar.png",
        password_hash: "$2b$10$hashedpassword",
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser),
      });

      mockComparePassword.mockResolvedValue(false);

      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "test@example.com",
        password: "wrongpassword",
      } as any);
      expect(result).toBeNull();
    });

    it("should return user object when credentials are valid", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        avatar_url: "https://example.com/avatar.png",
        password_hash: "$2b$10$hashedpassword",
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser),
      });

      mockComparePassword.mockResolvedValue(true);

      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "test@example.com",
        password: "correctpassword",
      } as any);

      expect(result).toEqual({
        id: "1",
        email: "test@example.com",
        name: "Test User",
        image: "https://example.com/avatar.png",
      });
    });

    it("should handle missing password_hash", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        avatar_url: "https://example.com/avatar.png",
        password_hash: null,
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser),
      });

      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "test@example.com",
        password: "password123",
      } as any);
      expect(result).toBeNull();
    });
  });

  describe("pages configuration", () => {
    it("should configure sign-in page", () => {
      expect(authOptions.pages?.signIn).toBe("/login");
    });

    it("should configure sign-out page", () => {
      expect(authOptions.pages?.signOut).toBe("/auth/signout");
    });

    it("should configure error page", () => {
      expect(authOptions.pages?.error).toBe("/auth/error");
    });

    it("should have a pages object", () => {
      expect(authOptions.pages).toBeDefined();
    });
  });

  describe("callbacks configuration", () => {
    it("should have jwt callback defined", () => {
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(typeof authOptions.callbacks?.jwt).toBe("function");
    });

    it("should have session callback defined", () => {
      expect(authOptions.callbacks?.session).toBeDefined();
      expect(typeof authOptions.callbacks?.session).toBe("function");
    });

    describe("jwt callback", () => {
      it("should add user id to token when user is present", async () => {
        const jwtCallback = authOptions.callbacks!.jwt;
        const token = { sub: "test-token" };
        const user = { id: "1", email: "test@example.com" };

        const result = await jwtCallback({ token, user } as any);

        expect(result).toBeDefined();
        expect((result as any).id).toBe("1");
      });

      it("should return token unchanged when no user is present", async () => {
        const jwtCallback = authOptions.callbacks!.jwt;
        const token = { sub: "test-token" };

        const result = await jwtCallback({ token } as any);

        expect(result).toEqual(token);
      });
    });

    describe("session callback", () => {
      it("should add user id to session when token has id", async () => {
        const sessionCallback = authOptions.callbacks!.session;
        const session = { user: { email: "test@example.com" } };
        const token = { id: "1", sub: "test-token" };

        const result = await sessionCallback({ session, token } as any);

        expect(result).toBeDefined();
        expect((result.session.user as any).id).toBe("1");
      });

      it("should return session unchanged when token has no id", async () => {
        const sessionCallback = authOptions.callbacks!.session;
        const session = { user: { email: "test@example.com" } };
        const token = { sub: "test-token" };

        const result = await sessionCallback({ session, token } as any);

        expect(result.session).toBe(session);
      });
    });
  });

  describe("secret configuration", () => {
    it("should have auth secret from config", () => {
      expect(authOptions.secret).toBeDefined();
      expect(authOptions.secret).toBe("test-secret-key-for-testing");
    });
  });

  describe("debug configuration", () => {
    it("should set debug based on NODE_ENV", () => {
      // In test environment, debug should be false
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      expect(authOptions.debug).toBe(false);

      process.env.NODE_ENV = originalEnv || "test";
    });
  });

  describe("authorize function edge cases", () => {
    it("should handle empty string email", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "",
        password: "password123",
      } as any);
      expect(result).toBeNull();
    });

    it("should handle empty string password", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "test@example.com",
        password: "",
      } as any);
      expect(result).toBeNull();
    });

    it("should handle whitespace-only email", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "   ",
        password: "password123",
      } as any);
      expect(result).toBeNull();
    });

    it("should handle undefined email", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: undefined,
        password: "password123",
      } as any);
      expect(result).toBeNull();
    });

    it("should handle undefined password", async () => {
      const authorize = authOptions.providers[0].authorize;
      const result = await authorize({
        email: "test@example.com",
        password: undefined,
      } as any);
      expect(result).toBeNull();
    });
  });
});

describe("NextAuth provider setup", () => {
  it("should have correct provider structure", () => {
    const provider = authOptions.providers[0];
    expect(provider).toHaveProperty("name");
    expect(provider).toHaveProperty("credentials");
    expect(provider).toHaveProperty("authorize");
  });

  it("should have type-safe credentials", () => {
    const credentials = authOptions.providers[0].credentials as any;
    expect(credentials.email).toBeDefined();
    expect(credentials.email.label).toBe("Email");
    expect(credentials.email.type).toBe("email");
    expect(credentials.password).toBeDefined();
    expect(credentials.password.label).toBe("Password");
    expect(credentials.password.type).toBe("password");
  });
});