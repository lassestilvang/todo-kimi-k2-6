import { NextRequest } from 'next/server';
import { generateProactiveSuggestions } from '@/lib/ai/proactive-suggestions';
import { getClientKey, checkRateLimit } from '@/lib/rate-limiter';
import { applyMiddleware } from '@/lib/api-middleware';
import type { TaskWithRelations } from '@/types';

export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, {
    requireAuth: true,
  });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const clientKey = getClientKey(request);
  const rateResult = await checkRateLimit(clientKey, {
    windowMs: 60000,
    max: 30,
  });

  if (!rateResult.allowed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { tasks, workHours } = body as {
      tasks: TaskWithRelations[];
      workHours?: { start: number; end: number };
    };

    if (!tasks || !Array.isArray(tasks)) {
      return Response.json({ error: 'Invalid tasks data' }, { status: 400 });
    }

    // Generate proactive suggestions
    const suggestions = await generateProactiveSuggestions(tasks, {
      workHours,
      usualCompletionRate: calculateCompletionRate(tasks),
    });

    return Response.json({ suggestions });
  } catch (error) {
    console.error('Proactive suggestions error:', error);
    return Response.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

function calculateCompletionRate(tasks: TaskWithRelations[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.completed).length;
  return completed / tasks.length;
}
