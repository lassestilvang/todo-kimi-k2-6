'use client';

import { useSession } from 'next-auth/react';

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
}

export function useAuth() {
  const { data: session, status } = useSession();

  const user: AuthUser | null = session?.user?.email
    ? {
        id: (session.user as { id?: number })?.id || 0,
        email: session.user.email,
        name: session.user.name || undefined,
      }
    : null;

  return {
    user,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated' && !!user,
  };
}

export function useCurrentUserId(): number | null {
  const { user } = useAuth();
  return user?.id ?? null;
}