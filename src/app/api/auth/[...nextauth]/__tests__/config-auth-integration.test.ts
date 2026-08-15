import { describe, it, expect, vi } from 'vitest';

// Mock modules before imports
vi.mock('@/lib/config', () => ({
  config: {
    auth: { secret: 'test-secret' },
  },
}));

vi.mock('@/lib/auth', () => ({
  comparePassword: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
}));

describe('NextAuth Configuration - Callback and Structure Tests', () => {
  describe('Provider and Configuration', () => {
    it('should have provider id of credentials', async () => {
      const { authOptions } = await import('../config');
      expect(authOptions.providers[0]?.id).toBe('credentials');
    });

    it('should have provider name Email', async () => {
      const { authOptions } = await import('../config');
      const provider = authOptions.providers[0] as any;
      expect(provider.options?.name).toBe('Email');
    });

    it('should have string credentials type for email', async () => {
      const { authOptions } = await import('../config');
      const provider = authOptions.providers[0] as any;
      expect(provider.options?.credentials.email.type).toBe('email');
    });

    it('should have password credentials type', async () => {
      const { authOptions } = await import('../config');
      const provider = authOptions.providers[0] as any;
      expect(provider.options?.credentials.password.type).toBe('password');
    });

    it('should have correct pages configuration', async () => {
      const { authOptions } = await import('../config');
      expect(authOptions.pages?.signIn).toBe('/login');
      expect(authOptions.pages?.signOut).toBe('/auth/signout');
      expect(authOptions.pages?.error).toBe('/auth/error');
    });
  });

  describe('JWT callback tests', () => {
    it('should preserve existing token when no user provided', async () => {
      const { authOptions } = await import('../config');
      const jwtCallback = authOptions.callbacks?.jwt;

      const token = { email: 'existing@test.com', existingProp: 'value' };
      const result = await jwtCallback?.({
        token,
        user: undefined as any,
      });

      expect(result).toEqual({
        email: 'existing@test.com',
        existingProp: 'value',
      });
    });

    it('should add id to token when user has id', async () => {
      const { authOptions } = await import('../config');
      const jwtCallback = authOptions.callbacks?.jwt;

      const result = await jwtCallback?.({
        token: {},
        user: { id: '123', email: 'test@test.com' },
      });

      expect(result).toHaveProperty('id', '123');
    });
  });

  describe('Session callback tests', () => {
    it('should return session unchanged when no token id', async () => {
      const { authOptions } = await import('../config');
      const sessionCallback = authOptions.callbacks?.session;

      const mockSession: any = {
        user: { email: 'no-id@test.com' },
        expires: new Date().toISOString(),
      };
      const result = await sessionCallback?.({
        session: mockSession,
        token: {},
      });

      expect(result).toEqual(mockSession);
    });

    it('should add id to session user when token has id', async () => {
      const { authOptions } = await import('../config');
      const sessionCallback = authOptions.callbacks?.session;

      const mockSession: any = {
        user: {} as any,
        expires: new Date().toISOString(),
      };
      const result = await sessionCallback?.({
        session: mockSession,
        token: { id: '789' },
      });

      expect((result?.user as any)?.id).toBe('789');
    });
  });
});
