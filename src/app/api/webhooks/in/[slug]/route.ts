import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  findActiveWebhookBySlug,
  recordWebhookCall,
} from '@/lib/actions/webhooks';
import { createTask } from '@/lib/actions/tasks';
import { errorResponse, jsonResponse } from '@/lib/api-middleware';
import { sanitizeString } from '@/lib/validation';

/** Max bytes for the raw webhook body — keep small to avoid DoS. */
const MAX_WEBHOOK_BODY_BYTES = 64 * 1024; // 64KB

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
 * Auth: the URL slug identifies the hook. If the hook has a `secret`, callers
 * MUST send `X-Webhook-Signature: sha256=<hex>` where `<hex>` is
 * `HMAC_SHA256(secret, raw_body)`. Without a valid signature, the request is
 * rejected (no task created).
 */
function verifySignature(
  secret: string,
  rawBody: string,
  header: string | null
): boolean {
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = header.startsWith('sha256=') ? header.slice(7) : header;
  // timingSafeEqual requires equal-length buffers.
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(provided, 'hex')
    );
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const hook = await findActiveWebhookBySlug(slug);
    if (!hook) return errorResponse('Unknown or inactive webhook', 404);

    // Reject oversized bodies early — both the Content-Length header and the
    // actual byte length (defence in depth against missing/wrong headers).
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
      return errorResponse('Body too large', 413);
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
      return errorResponse('Body too large', 413);
    }

    let body: Record<string, unknown> = {};
    try {
      body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    // If a secret is configured, require a matching signature.
    if (hook.secret) {
      const sig = request.headers.get('x-webhook-signature');
      if (!verifySignature(hook.secret, rawBody, sig)) {
        return errorResponse('Invalid signature', 401);
      }
    }

    // Sanitize all free-form text before persisting — this comes from the
    // public internet, even if authenticated via HMAC, so strip any HTML /
    // script tags and dangerous protocols.
    const titleRaw = sanitizeString(
      typeof body.title === 'string'
        ? body.title
        : body.subject && typeof body.subject === 'string'
          ? body.subject
          : null
    ) ?? `Webhook ${slug} ${new Date().toISOString()}`;

    const description = [
      typeof body.description === 'string'
        ? (sanitizeString(body.description) ?? '')
        : '',
      typeof body.source_url === 'string'
        ? `\nSource: ${sanitizeString(body.source_url) ?? ''}`
        : '',
      typeof body.payload !== 'undefined'
        ? `\n\nPayload:\n\`\`\`json\n${JSON.stringify(body.payload, null, 2).slice(0, 3000)}\n\`\`\``
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
      name: titleRaw.slice(0, 200),
      description: description.slice(0, 4000),
      priority,
    });

    await recordWebhookCall(hook.id);

    return jsonResponse({ ok: true, task_id: task?.id ?? null }, 201);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}
