import { NextRequest } from 'next/server';
import {
  estimateTravelTime,
  recordTravelSegment,
  listTravelSegments,
} from '@/lib/actions/travel-time';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const mode = searchParams.get('mode');
    if (from && to) {
      const allowed = ['walking', 'transit', 'driving', 'cycling'] as const;
      const modeSafe = (allowed.find(x => x === mode) ?? 'driving') as
        | 'walking'
        | 'transit'
        | 'driving'
        | 'cycling';
      const r = await estimateTravelTime(from, to, modeSafe);
      return jsonResponse({ ...r }, 200, m.headers);
    }
    return jsonResponse({ segments: await listTravelSegments() }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as {
      from_location: string;
      to_location: string;
      mode?: 'walking' | 'transit' | 'driving' | 'cycling';
      duration_minutes: number;
      distance_km?: number | null;
      notes?: string;
    };
    if (!body.from_location || !body.to_location || !body.duration_minutes) {
      return errorResponse('from_location, to_location, duration_minutes required', 400);
    }
    const seg = await recordTravelSegment(body);
    return jsonResponse({ segment: seg }, 201, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}
