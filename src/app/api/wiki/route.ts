import { NextRequest, NextResponse } from 'next/server';
import {
  createWikiPage,
  getWikiPagesForProject,
  searchWikiPages,
} from '@/lib/actions/project-wiki';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = Number(searchParams.get('project_id') || 1);
    const query = searchParams.get('q');

    if (query) {
      const results = await searchWikiPages(query, projectId);
      return NextResponse.json(results);
    }

    const pages = await getWikiPagesForProject(projectId);
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
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
    const { project_id, title, content, parent_id } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content required' }, { status: 400 });
    }

    const page = await createWikiPage({
      project_id: Number(project_id || 1),
      title,
      content,
      parent_id: parent_id || undefined,
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error creating wiki page:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}