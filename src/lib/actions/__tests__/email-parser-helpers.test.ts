import { describe, it, expect } from 'vitest';

describe('email-parser-helpers', () => {
  describe('shouldExcludeEmail', () => {
    it('excludes emails with unsubscribe keyword', async () => {
      const { shouldExcludeEmail } = await import('@/lib/actions/email-parser-helpers');
      const result = shouldExcludeEmail({
        message_id: '1',
        subject: 'Test',
        sender: 'a@b.com',
        body: 'Please unsubscribe me',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result).toBe(true);
    });

    it('excludes out of office replies', async () => {
      const { shouldExcludeEmail } = await import('@/lib/actions/email-parser-helpers');
      const result = shouldExcludeEmail({
        message_id: '1',
        subject: 'Out of office',
        sender: 'a@b.com',
        body: 'I am currently out of the office',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result).toBe(true);
    });

    it('excludes auto-replies', async () => {
      const { shouldExcludeEmail } = await import('@/lib/actions/email-parser-helpers');
      const result = shouldExcludeEmail({
        message_id: '1',
        subject: 'Auto-Reply',
        sender: 'a@b.com',
        body: 'This is an auto-reply',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result).toBe(true);
    });

    it('does not exclude normal task emails', async () => {
      const { shouldExcludeEmail } = await import('@/lib/actions/email-parser-helpers');
      const result = shouldExcludeEmail({
        message_id: '1',
        subject: 'New task',
        sender: 'a@b.com',
        body: 'Please complete the report by Friday',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result).toBe(false);
    });

    it('respects custom exclude keywords', async () => {
      const { shouldExcludeEmail } = await import('@/lib/actions/email-parser-helpers');
      const result = shouldExcludeEmail(
        {
          message_id: '1',
          subject: 'Newsletter',
          sender: 'a@b.com',
          body: 'Newsletter content',
          received_at: '2025-01-01T00:00:00Z',
        },
        ['newsletter']
      );
      expect(result).toBe(true);
    });
  });

  describe('parseEmailToTask', () => {
    it('parses email with "please" keyword', async () => {
      const { parseEmailToTask } = await import('@/lib/actions/email-parser-helpers');
      const result = parseEmailToTask({
        message_id: '1',
        subject: 'Action needed',
        sender: 'boss@company.com',
        body: 'Please review the document by Friday.',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
      expect(result.parsed_fields?.title).toBeTruthy();
    });

    it('parses email with task: prefix', async () => {
      const { parseEmailToTask } = await import('@/lib/actions/email-parser-helpers');
      const result = parseEmailToTask({
        message_id: '1',
        subject: 'Hi',
        sender: 'a@b.com',
        body: 'task: Update documentation',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
      expect(result.parsed_fields?.title).toContain('Update documentation');
    });

    it('returns skipped for emails without task content', async () => {
      const { parseEmailToTask } = await import('@/lib/actions/email-parser-helpers');
      const result = parseEmailToTask({
        message_id: '1',
        subject: 'Hello',
        sender: 'a@b.com',
        body: 'Just saying hi',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result.skipped).toBe(true);
      expect(result.success).toBe(false);
    });

    it('strips "Re:" prefix from subject', async () => {
      const { parseEmailToTask } = await import('@/lib/actions/email-parser-helpers');
      const result = parseEmailToTask({
        message_id: '1',
        subject: 'Re: Help needed with project',
        sender: 'a@b.com',
        body: 'Please help',
        received_at: '2025-01-01T00:00:00Z',
      });
      if (result.parsed_fields) {
        expect(result.parsed_fields.title).not.toMatch(/^Re:/);
      }
    });

    it('includes sender as assignee', async () => {
      const { parseEmailToTask } = await import('@/lib/actions/email-parser-helpers');
      const result = parseEmailToTask({
        message_id: '1',
        subject: 'Please help',
        sender: 'manager@example.com',
        body: 'Need to update the system',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(result.parsed_fields?.assignee).toBe('manager@example.com');
    });
  });

  describe('extractDueDate', () => {
    it('extracts ISO date format', async () => {
      const { extractDueDate } = await import('@/lib/actions/email-parser-helpers');
      const date = extractDueDate('Due 2025-12-31');
      expect(date).toBe('2025-12-31');
    });

    it('extracts "by Friday" pattern', async () => {
      const { extractDueDate } = await import('@/lib/actions/email-parser-helpers');
      const date = extractDueDate('by Friday');
      // Should return a YYYY-MM-DD string
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('extracts "in 3 days" pattern', async () => {
      const { extractDueDate } = await import('@/lib/actions/email-parser-helpers');
      const date = extractDueDate('Need this in 3 days');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('extracts "in 2 weeks" pattern', async () => {
      const { extractDueDate } = await import('@/lib/actions/email-parser-helpers');
      const date = extractDueDate('Complete in 2 weeks');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns undefined when no date pattern found', async () => {
      const { extractDueDate } = await import('@/lib/actions/email-parser-helpers');
      const date = extractDueDate('No date here');
      expect(date).toBeUndefined();
    });
  });

  describe('extractPriority', () => {
    it('detects critical priority', async () => {
      const { extractPriority } = await import('@/lib/actions/email-parser-helpers');
      expect(extractPriority('URGENT: please help')).toBe('critical');
      expect(extractPriority('This is an emergency')).toBe('critical');
      expect(extractPriority('Need this ASAP')).toBe('critical');
    });

    it('detects high priority', async () => {
      const { extractPriority } = await import('@/lib/actions/email-parser-helpers');
      expect(extractPriority('High priority task')).toBe('high');
      expect(extractPriority('Important request')).toBe('high');
    });

    it('detects low priority', async () => {
      const { extractPriority } = await import('@/lib/actions/email-parser-helpers');
      expect(extractPriority('Low priority item')).toBe('low');
      expect(extractPriority('This can be deferred')).toBe('low');
    });

    it('returns undefined when no priority keyword', async () => {
      const { extractPriority } = await import('@/lib/actions/email-parser-helpers');
      expect(extractPriority('Normal task')).toBeUndefined();
    });
  });

  describe('extractLabels', () => {
    it('extracts Gmail labels and sender email', async () => {
      const { extractLabels } = await import('@/lib/actions/email-parser-helpers');
      const labels = extractLabels({
        message_id: '1',
        subject: 'Test',
        sender: 'a@b.com',
        body: 'Body',
        received_at: '2025-01-01T00:00:00Z',
        label_ids: ['INBOX', 'IMPORTANT', 'STARRED'],
      });
      expect(labels).toEqual(['INBOX', 'IMPORTANT', 'STARRED', 'a@b.com']);
    });

    it('returns only sender email when no Gmail labels', async () => {
      const { extractLabels } = await import('@/lib/actions/email-parser-helpers');
      const labels = extractLabels({
        message_id: '1',
        subject: 'Test',
        sender: 'a@b.com',
        body: 'Body',
        received_at: '2025-01-01T00:00:00Z',
      });
      expect(labels).toEqual(['a@b.com']);
    });
  });
});
