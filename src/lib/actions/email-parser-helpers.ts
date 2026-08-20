import { z } from 'zod';
import { sanitizeString } from '@/lib/validation';

// Schema for incoming email webhook
const EmailWebhookSchema = z.object({
  message_id: z.string(),
  subject: z.string(),
  sender: z.string(),
  recipients: z.array(z.string()).optional(),
  body: z.string(),
  html_body: z.string().optional(),
  received_at: z.string().datetime(),
  headers: z.record(z.string(), z.string()).optional(),
  label_ids: z.array(z.string()).optional(),
  thread_id: z.string().optional(),
  external_url: z.string().url().optional(),
});

// Schema for email processing options
const EmailProcessingOptionsSchema = z.object({
  auto_create: z.boolean().default(true),
  auto_label: z.boolean().default(false),
  auto_assign: z.boolean().default(false),
  default_list_id: z.number().optional(),
  keywords_to_task: z.array(z.string()).optional(),
  exclude_keywords: z.array(z.string()).optional(),
});

export interface EmailToTaskResult {
  success: boolean;
  skipped: boolean;
  reason?: string;
  confidence: number;
  parsed_fields?: {
    title: string;
    description: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    labels?: string[];
    assignee?: string;
  };
}

/**
 * Check if an email should be excluded from task creation
 */
export function shouldExcludeEmail(
  email: z.infer<typeof EmailWebhookSchema>,
  excludeKeywords?: string[]
): boolean {
  const text = (email.subject + ' ' + email.body).toLowerCase();
  const keywords = excludeKeywords || [
    'unsubscribe',
    'bounce',
    'auto-reply',
    'out of office',
  ];

  return keywords.some(keyword => text.includes(keyword));
}

/**
 * Parse email content to extract task information
 */
export function parseEmailToTask(
  email: z.infer<typeof EmailWebhookSchema>,
  options?: z.infer<typeof EmailProcessingOptionsSchema>
): EmailToTaskResult {
  const text = email.subject + '\n\n' + email.body;
  const keywordsToTask = options?.keywords_to_task || [
    'task:',
    'todo:',
    'action:',
    'please',
    'help',
    'need to',
    'require',
  ];

  // Check if email contains task-related content
  const hasTaskKeyword = keywordsToTask.some(keyword =>
    text.toLowerCase().includes(keyword)
  );

  if (!hasTaskKeyword) {
    return {
      success: false,
      skipped: true,
      confidence: 0.3,
      reason: 'Email does not appear to contain task request',
    };
  }

  // Extract title from subject
  let title = email.subject.replace(/^(Re|Fwd):\s*/i, '').trim();

  // Try to extract title from task markers in body
  const taskMarkerMatch = email.body.match(/^(task|todo|action):\s*(.+)$/im);
  if (taskMarkerMatch) {
    title = taskMarkerMatch[2].split('\n')[0].trim();
  }

  // Extract body text
  const description = email.body.trim();

  // Extract due date
  const dueDate = extractDueDate(email.body);

  // Extract priority
  const priority = extractPriority(email.subject + ' ' + email.body);

  // Extract labels
  const labels = extractLabels(email);

  // Extract assignee
  const assignee = email.sender;

  return {
    success: true,
    skipped: false,
    confidence: 0.85,
    parsed_fields: {
      title: sanitizeString(title) || 'New task from email',
      description,
      due_date: dueDate,
      priority,
      labels,
      assignee,
    },
  };
}

/**
 * Extract due date from email content using multiple patterns
 */
export function extractDueDate(text: string): string | undefined {
  const patterns: Array<{
    pattern: RegExp;
    transformer: (match: RegExpMatchArray) => string | null;
  }> = [
    // "due by Jan 15" or "due: Jan 15"
    {
      pattern:
        /\b(due\s+(?:by\s+)?|due:\s*)(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/i,
      transformer: m => m[2],
    },
    // "by Friday" or "by next Tuesday"
    {
      pattern:
        /\bby\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      transformer: m => {
        const dayName = m[2].toLowerCase();
        const days = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const today = new Date();
        const todayDay = today.getDay();
        const targetDay = days.indexOf(dayName);
        let daysUntil = targetDay - todayDay;
        if (daysUntil <= 0) daysUntil += 7;
        if (m[1]) daysUntil += 7; // next week
        const date = new Date(today);
        date.setDate(today.getDate() + daysUntil);
        return date.toISOString().split('T')[0];
      },
    },
    // "in 3 days" or "in 2 weeks"
    {
      pattern: /\din\s+(\d+)\s*(day|days|week|weeks|month|months)\b/i,
      transformer: m => {
        const amount = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        const days = unit.startsWith('week')
          ? amount * 7
          : unit.startsWith('month')
            ? amount * 30
            : amount;
        const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
      },
    },
    // Date pattern like "Jan 15, 2025" or "15 Jan 2025"
    {
      pattern: /\b(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/,
      transformer: m => m[1],
    },
    // ISO date
    {
      pattern: /\b(\d{4}-\d{2}-\d{2})\b/,
      transformer: m => m[1],
    },
  ];

  for (const { pattern, transformer } of patterns) {
    const match = text.match(pattern);
    if (match) {
      const result = transformer(match);
      return result ?? undefined;
    }
  }

  return undefined;
}

/**
 * Extract priority from email content
 */
export function extractPriority(
  text: string
): 'low' | 'medium' | 'high' | 'critical' | undefined {
  const lower = text.toLowerCase();

  if (/urgent|asap|immediate|critical|emergency/i.test(lower)) {
    return 'critical';
  }
  if (/high|important|priority/i.test(lower)) {
    return 'high';
  }
  if (/low|deferred|later/i.test(lower)) {
    return 'low';
  }

  return undefined;
}

/**
 * Extract labels from email
 */
export function extractLabels(
  email: z.infer<typeof EmailWebhookSchema>
): string[] | undefined {
  const labels: string[] = [];

  // Extract from Gmail labels
  if (email.label_ids) {
    labels.push(...email.label_ids);
  }

  // Extract senders as labels
  if (email.sender) {
    const senderMatch = email.sender.match(/<?([^>]+)>?/);
    if (senderMatch) {
      labels.push(senderMatch[1]);
    }
  }

  return labels.length > 0 ? labels : undefined;
}
