import { NextRequest } from 'next/server';
import {
  findActiveWebhookBySlug,
  recordWebhookCall,
} from '@/lib/actions/webhooks';
import { createTask } from '@/lib/actions/tasks';
import { errorResponse, jsonResponse } from '@/lib/api-middleware';

/**
 * Public webhook ingestion endpoint.
 *
 * POST /api/webhooks/in/:slug
 * Body shape (loose, all optional):
 * {
 *   title: string,
 *   description?: string,
 *   priority?: 'critical'|'high'|'medium'|'low'|'none',
 *   source_url?: string,
 *   payload?: any
 * }
 *
 * Auth: the URL itself is the secret. For production, callers should add a
 * signature header check (HMAC over the body using webhook.secret).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const hook = await findActiveWebhookBySlug(slug);
    if (!hook) return errorResponse('Unknown or inactive webhook', 404);

    const body = await request.json().catch(() => ({}));
    const title =
      typeof body.title === 'string'
        ? body.title
        : body.subject && typeof body.subject === 'string'
        ? body.subject
        : `Webhook ${slug} ${new Date().toISOString()}`;

    const description = [
      typeof body.description === 'string' ? body.description : '',
      typeof body.source_url === 'string' ? `\nSource: ${body.source_url}` : '',
      typeof body.payload !== 'undefined'
        ? `\n\nPayload:\n\`\`\`json\n${JSON.stringify(body.payload, null, 2)}\n\`\`\``
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const priority =
      body.priority === 'critical' ||
      body.priority === 'high' ||
      body.priority === 'medium' ||
      body.priority === 'low' ||
      body.priority === 'none'
        ? body.priority
        : 'medium';

    const task = await createTask({
      name: title.slice(0, 200),
      description: description.slice(0, 4000),
      priority,
    });

    await recordWebhookCall(hook.id);

    return jsonResponse({ ok: true, task_id: task?.id ?? null }, 201);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}
