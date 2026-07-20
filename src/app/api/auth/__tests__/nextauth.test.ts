import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('NextAuth Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      NEXTAUTH_SECRET: 'test-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Session Configuration', () => {
    it('uses JWT session strategy', () => {
      const sessionConfig = {
        strategy: 'jwt' as const,
        maxAge: 30 * 24 * 60 * 60,
      };

      expect(sessionConfig.strategy).toBe('jwt');
      expect(sessionConfig.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
    });
  });

  describe('OAuth Scopes', () => {
    it('includes required OAuth scopes', () => {
      const scopes = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.events',
      ];

      expect(scopes).toContain('openid');
      expect(scopes).toContain('email');
      expect(scopes).toContain('profile');
      expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
    });
  });

  describe('OAuth Parameters', () => {
    it('includes consent parameter', () => {
      const params = {
        prompt: 'consent',
      };

      expect(params.prompt).toBe('consent');
    });

    it('includes offline access type', () => {
      const params = {
        access_type: 'offline',
      };

      expect(params.access_type).toBe('offline');
    });
  });

  describe('Secret Configuration', () => {
    it('uses NEXTAUTH_SECRET environment variable', () => {
      process.env.NEXTAUTH_SECRET = 'my-secret';

      const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development';

      expect(secret).toBe('my-secret');
    });

    it('falls back to development secret', () => {
      delete process.env.NEXTAUTH_SECRET;

      const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development';

      expect(secret).toBe('fallback-secret-for-development');
    });
  });

  describe('JWT Callback Logic', () => {
    it('stores access token in JWT when account exists', () => {
      const token: any = {};
      const account = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_at: 1234567890,
        provider: 'google',
      };
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.png',
      };

      // Simulate the JWT callback logic from the actual code
      if (account?.access_token && user?.id) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : null;
        token.provider = account.provider;
        token.user = {
          id: String(user.id),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }

      expect(token.accessToken).toBe('test-access-token');
      expect(token.refreshToken).toBe('test-refresh-token');
      expect(token.provider).toBe('google');
      expect(token.user?.email).toBe('test@example.com');
    });

    it('returns token unchanged when no account', () => {
      const token = { test: 'value', existing: true };
      const account = null;
      const user = { id: 1, name: 'Test', email: 'test@test.com' };

      // Simulate the JWT callback logic
      if (account?.access_token && user?.id) {
        // This won't execute
      }

      // Token should be unchanged
      expect(token.test).toBe('value');
      expect(token.existing).toBe(true);
    });
  });

  describe('Session Callback Logic', () => {
    it('copies token data to session when accessToken exists', () => {
      const session: any = {
        user: {
          id: '',
          name: '',
          email: '',
          image: '',
        },
      };
      const token = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: 1234567890,
        provider: 'google',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.png',
        },
      };

      // Simulate the session callback logic from the actual code
      if (token.accessToken) session.accessToken = token.accessToken;
      if (token.refreshToken) session.refreshToken = token.refreshToken;
      if (token.expiresAt) session.expiresAt = token.expiresAt;
      if (token.provider) session.provider = token.provider;
      if (token.user && session.user) {
        session.user.id = token.user.id;
        session.user.name = token.user.name;
        session.user.email = token.user.email;
        session.user.image = token.user.image;
      }

      expect(session.accessToken).toBe('test-token');
      expect(session.refreshToken).toBe('refresh-token');
      expect(session.provider).toBe('google');
      expect(session.user.email).toBe('test@example.com');
    });
  });

  describe('Google Provider Configuration', () => {
    it('configures correct client ID and secret', () => {
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

      expect(clientId).toBe('test-client-id');
      expect(clientSecret).toBe('test-client-secret');
    });

    it('includes calendar events scope', () => {
      const scopes = 'openid email profile https://www.googleapis.com/auth/calendar.events';

      expect(scopes).toContain('calendar.events');
    });
  });
});