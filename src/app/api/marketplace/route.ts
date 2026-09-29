import { NextRequest, NextResponse } from 'next/server';
import { createMarketplaceListing, getMarketplaceListings } from '@/lib/actions/task-marketplace';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const skill = searchParams.get('skill');
    const limit = Number(searchParams.get('limit') || 50);

    const listings = await getMarketplaceListings({
      category: category || undefined,
      skill: skill || undefined,
      limit,
    });

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, price_xp, estimated_hours, required_skills, category } = body;

    if (!task_id || !price_xp) {
      return NextResponse.json({ error: 'task_id and price_xp required' }, { status: 400 });
    }

    const listing = await createMarketplaceListing({
      task_id: Number(task_id),
      price_xp: Number(price_xp),
      estimated_hours: Number(estimated_hours) || 1,
      required_skills: required_skills || [],
      category: category || 'other',
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}