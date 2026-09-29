import { NextRequest, NextResponse } from 'next/server';
import {
  getWikiPage,
  updateWikiPage,
  addWikiComment,
  getWikiRevisions,
} from '@/lib/actions/project-wiki';
import { getCurrentUser } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pageId = Number(id);
    const { searchParams } = new URL(request.url);
    const includeRevisions = searchParams.get('revisions') === 'true';

    const page = await getWikiPage(pageId);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (includeRevisions) {
      const revisions = await getWikiRevisions(pageId);
      return NextResponse.json({ page, revisions });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching wiki page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, changes_summary } = body;

    const updated = await updateWikiPage({
      id: Number(id),
      title,
      content,
      changes_summary: changes_summary || 'Updated page',
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating wiki page:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, comment } = body;

    if (action === 'comment' && comment) {
      await addWikiComment(Number(id), comment);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error performing wiki action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}