import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createPage } from './mocked-server';
const mockCalendar = setupServer(rest.get('/api/calendar/sync', (req, res, ctx) => {
  return res(ctx.json({
    events: [
      { id: '1', title: 'Sync Test', description: 'Calendar Sync Test', date: '2023-10-05T10:00:00Z' }
    ]
  }));
}));
beforeAll(() => mockCalendar.listen());
afterAll(() => mockCalendar.close());
test('Calendar Sync Integration', async () => {
  // Setup test environment
  await createPage('/calendar');
  // Wait for calendar to load
  await page.waitForSelector('.calendar-events', { timeout: 5000 });
  // Get rendered events
  const events = await page.$$eval('.event-container', el => (el as HTMLElement).innerText);
  // Verify event structure
  expect(events).toContain('Sync Test');
  expect(events).toContain('Calendar Sync Test');
  expect(events).toContain('2023-10-05T10:00:00Z');
});