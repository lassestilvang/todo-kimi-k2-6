import { NextRequest, NextResponse } from 'next/server';
import {
  logCognitiveLoad,
  getCognitiveLoadAnalysis,
} from '@/lib/actions/enhanced-productivity';
import { applyMiddleware } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  try {
    const body = await request.json();
    const log = await logCognitiveLoad(body);
    return NextResponse.json({ success: true, id: log.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to log cognitive load',
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7');

  try {
    const userId = middleware.auth?.userId ?? 1;
    const analysis = await getCognitiveLoadAnalysis(userId, days);
    return NextResponse.json({
      ...analysis,
      userId,
      period: `${days} days`,
      dataPoints: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get cognitive load analysis',
      },
      { status: 400 }
    );
  }
}
