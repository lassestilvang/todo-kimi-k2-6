import { NextRequest, NextResponse } from 'next/server';
import {
  logEnergyBudget,
  getEnergyBudget,
  getEnergyProfile,
  upsertEnergyProfile,
} from '@/lib/actions/enhanced-productivity';
import { applyMiddleware } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  try {
    const body = await request.json();

    if (body.action === 'log') {
      const log = await logEnergyBudget(body);
      return NextResponse.json({ success: true, balance: log.balance });
    }

    if (body.action === 'saveProfile') {
      await upsertEnergyProfile(body.profile);
      return NextResponse.json({ success: true });
    }

    // Default response
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process energy request',
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

  try {
    if (searchParams.has('date')) {
      const date = searchParams.get('date');
      if (!date) {
        return NextResponse.json(
          { error: 'Date parameter is required' },
          { status: 400 }
        );
      }
      const budget = await getEnergyBudget(date);
      return NextResponse.json(budget);
    }

    // Get energy profile
    const profile = await getEnergyProfile();
    if (!profile) {
      return NextResponse.json(
        { error: 'No energy profile found' },
        { status: 404 }
      );
    }

    const budget = await getEnergyBudget(
      new Date().toISOString().split('T')[0]
    );
    return NextResponse.json({ profile, budget });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to get energy data',
      },
      { status: 400 }
    );
  }
}
