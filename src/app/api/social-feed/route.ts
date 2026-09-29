import { NextRequest, NextResponse } from 'next/server';
import { createFeedPost, getFeed } from '@/lib/actions/social-feed';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 50);
    const filter = searchParams.get('filter') as 'all' | 'team' | 'following' | undefined;

    const posts = await getFeed({ limit, filter: filter || 'all' });
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching feed:', error);
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
    const { activity_type, title, description, metadata, visibility } = body;

    if (!activity_type || !title) {
      return NextResponse.json(
        { error: 'activity_type and title required' },
        { status: 400 }
      );
    }

    const post = await createFeedPost(
      activity_type,
      title,
      description || '',
      metadata || {},
      visibility || 'team'
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
