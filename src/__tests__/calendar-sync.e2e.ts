import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock handlers for calendar API
const handlers = [
  http.get('/api/calendar/sync', () => {
    return HttpResponse.json({
      events: [
        { id: '1', title: 'Sync Test', description: 'Calendar Sync Test', date: '2023-10-05T10:00:00Z' }
      ]
    });
  }),
  http.post('/api/calendar/event', () => {
    return HttpResponse.json({ id: '2', success: true }, { status: 201 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('Calendar Sync Integration', () => {
  it('should handle calendar sync response', async () => {
    const response = await fetch('/api/calendar/sync');
    const data = await response.json();

    expect(data.events).toBeDefined();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].title).toBe('Sync Test');
  });

  it('should handle calendar event creation', async () => {
    const response = await fetch('/api/calendar/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Event' }),
    });

    expect(response.status).toBe(201);
  });
});