import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../calendar/status/route';
import { NextRequest } from 'next/server';

// Mock the calendar module at the top level for proper hoisting
vi.mock('@/lib/actions/calendar', () => ({
  getCalendarSync: vi.fn(),
}));

// Import after mock is defined
import { getCalendarSync } from '@/lib/actions/calendar';

describe('Calendar Status API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return connected status when calendar is synced', async () => {
    (getCalendarSync as any).mockResolvedValue({
      provider: 'google',
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      enabled: true,
      created_at: new Date().toISOString(),
    });

    const request = new NextRequest('http://localhost/api/calendar/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(true);
    expect(data.provider).toBe('google');
  });

  it('should return disconnected status when no calendar sync', async () => {
    (getCalendarSync as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/calendar/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
    expect(data.provider).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    (getCalendarSync as any).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/calendar/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connected).toBe(false);
    expect(data.error).toBeDefined();
  });
});
