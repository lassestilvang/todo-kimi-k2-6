'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logError } from '@/lib/logger';

export interface WikiPage {
  id: number;
  project_id: number;
  title: string;
  content: string;
  parent_id: number | null;
  author_id: number;
  views: number;
  last_edited_by: number;
  created_at: string;
  updated_at: string;
}

export interface WikiRevision {
  id: number;
  page_id: number;
  content: string;
  editor_id: number;
  changes_summary: string;
  created_at: string;
}

export interface CreateWikiPageInput {
  project_id: number;
  title: string;
  content: string;
  parent_id?: number;
}

export interface UpdateWikiPageInput {
  id: number;
  title?: string;
  content?: string;
  changes_summary?: string;
}

/**
 * Create a new wiki page
 */
export async function createWikiPage(
  input: CreateWikiPageInput
): Promise<WikiPage> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `INSERT INTO wiki_pages
       (project_id, title, content, parent_id, author_id, views, last_edited_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run(
      input.project_id,
      input.title,
      input.content,
      input.parent_id || null,
      user.id,
      user.id
    );

  return db
    .prepare('SELECT * FROM wiki_pages WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as WikiPage;
}

/**
 * Update wiki page content
 */
export async function updateWikiPage(
  input: UpdateWikiPageInput
): Promise<WikiPage | undefined> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  // Get current page for revision history
  const currentPage = db
    .prepare('SELECT * FROM wiki_pages WHERE id = ?')
    .get(input.id) as WikiPage | undefined;

  if (!currentPage) {
    return undefined;
  }

  // Save revision
  db.prepare(
    `INSERT INTO wiki_revisions
     (page_id, content, editor_id, changes_summary, created_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).run(currentPage.id, currentPage.content, user.id, input.changes_summary || 'Updated page');

  // Update page
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    values.push(input.title);
  }
  if (input.content !== undefined) {
    fields.push('content = ?');
    values.push(input.content);
  }

  fields.push('last_edited_by = ?', 'updated_at = CURRENT_TIMESTAMP');
  values.push(user.id, input.id);

  db.prepare(`UPDATE wiki_pages SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return db.prepare('SELECT * FROM wiki_pages WHERE id = ?').get(input.id) as WikiPage;
}

/**
 * Get a wiki page
 */
export async function getWikiPage(id: number): Promise<WikiPage | undefined> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return undefined;
  }

  // Increment view count
  db.prepare('UPDATE wiki_pages SET views = views + 1 WHERE id = ?').run(id);

  return db.prepare('SELECT * FROM wiki_pages WHERE id = ?').get(id) as WikiPage | undefined;
}

/**
 * List wiki pages for a project
 */
export async function getWikiPagesForProject(
  projectId: number
): Promise<WikiPage[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  return db
    .prepare(
      `SELECT * FROM wiki_pages
       WHERE project_id = ?
       ORDER BY parent_id, title ASC`
    )
    .all(projectId) as WikiPage[];
}

/**
 * Search wiki pages
 */
export async function searchWikiPages(
  query: string,
  projectId?: number
): Promise<WikiPage[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const Fuse = (await import('fuse.js')).default;
  let pages: WikiPage[];

  if (projectId) {
    pages = db
      .prepare('SELECT * FROM wiki_pages WHERE project_id = ?')
      .all(projectId) as WikiPage[];
  } else {
    pages = db.prepare('SELECT * FROM wiki_pages').all() as WikiPage[];
  }

  const fuse = new Fuse(pages, {
    keys: ['title', 'content'],
    threshold: 0.4,
  });

  return fuse.search(query).map(r => r.item);
}

/**
 * Get wiki revisions
 */
export async function getWikiRevisions(pageId: number): Promise<WikiRevision[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  return db
    .prepare(
      `SELECT * FROM wiki_revisions
       WHERE page_id = ?
       ORDER BY created_at DESC`
    )
    .all(pageId) as WikiRevision[];
}

/**
 * Get wiki page tree structure
 */
export async function getWikiPageTree(projectId: number): Promise<Array<{
  page: WikiPage;
  children: WikiPage[];
}>> {
  const pages = await getWikiPagesForProject(projectId);

  // Build tree
  const pageMap = new Map<number, WikiPage>();
  pages.forEach(p => pageMap.set(p.id, p));

  const rootPages = pages.filter(p => !p.parent_id);

  return rootPages.map(page => ({
    page,
    children: pages.filter(p => p.parent_id === page.id),
  }));
}

/**
 * Add comment to wiki page
 */
export async function addWikiComment(
  pageId: number,
  content: string,
  lineNumber?: number
): Promise<{
  id: number;
  page_id: number;
  content: string;
  author_id: number;
  line_number: number | null;
  created_at: string;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `INSERT INTO wiki_comments
       (page_id, content, author_id, line_number, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .run(pageId, content, user.id, lineNumber || null);

  return db
    .prepare('SELECT * FROM wiki_comments WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as any;
}

/**
 * Link wiki page to task
 */
export async function linkPageToTask(
  pageId: number,
  taskId: number
): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return false;
  }

  try {
    db.prepare(
      `INSERT OR IGNORE INTO wiki_task_links (page_id, task_id, created_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).run(pageId, taskId);
    return true;
  } catch (error) {
    logError('Failed to link wiki page to task', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}