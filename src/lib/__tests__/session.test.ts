import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next-auth and authOptions
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/app/api/auth/[...nextauth]/config', () => ({
  authOptions: {},
}));

describe('Session utilities', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module cache
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
    // Restore global.window check
    delete (global as any).window;
  });

  describe('getCurrentUser in test environment', () => {
    it('should return null in test environment with no demo mode', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.NEXTAUTH_SECRET;

      const { getCurrentUser } = await import('../session');
      const user = await getCurrentUser();

      // Test environment but no demo mode - returns null
      expect(user).toBeNull();
    });

    it('should return demo user in test environment with demo secret', async () => {
      process.env.NODE_ENV = 'test';
      process.env.NEXTAUTH_SECRET = 'demo-secret';

      const { getCurrentUser } = await import('../session');
      const user = await getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
      expect(user?.email).toBe('demo@taskflow.app');
      expect(user?.name).toBe('Demo User');
    });

    it('should return demo user when window is defined (browser)', async () => {
      process.env.NODE_ENV = 'development';
      (global as any).window = {};

      const { getCurrentUser } = await import('../session');
      const user = await getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.email).toBe('demo@taskflow.app');
    });

    it('should return demo user in development mode without NEXTAUTH_SECRET', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXTAUTH_SECRET;

      const { getCurrentUser } = await import('../session');
      const user = await getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
    });
  });

  describe('requireUserId', () => {
    it('should throw error when no user in test environment', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.NEXTAUTH_SECRET;

      const { requireUserId } = await import('../session');

      await expect(requireUserId()).rejects.toThrow('Authentication required');
    });

    it('should return user id when user exists', async () => {
      process.env.NODE_ENV = 'test';
      process.env.NEXTAUTH_SECRET = 'demo-secret';

      const { requireUserId } = await import('../session');
      const userId = await requireUserId();

      expect(userId).toBe(1);
    });
  });

  describe('Session User types', () => {
    it('should have correct user structure', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
        created_at: '2024-01-01',
      };

      expect(user.id).toBe(1);
      expect(user.email).toContain('@');
      expect(user.name).toBeDefined();
      expect(user.avatar_url).toBeNull();
      expect(user.created_at).toBeDefined();
    });
  });
});
