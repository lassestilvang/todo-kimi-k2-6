'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit,
  History,
  MessageSquare,
  TreePine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  getWikiPagesForProject,
  getWikiPage,
  createWikiPage,
  updateWikiPage,
  searchWikiPages,
  getWikiPageTree,
  getWikiRevisions,
  addWikiComment,
} from '@/lib/actions/project-wiki';
import { toast } from 'sonner';

interface WikiPage {
  id: number;
  project_id: number;
  title: string;
  content: string;
  parent_id: number | null;
  author_id: number;
  views: number;
  created_at: string;
  updated_at: string;
}

interface WikiRevision {
  id: number;
  page_id: number;
  content: string;
  editor_id: number;
  changes_summary: string;
  created_at: string;
}

interface WikiTreeItem {
  page: WikiPage;
  children: WikiPage[];
}

export function ProjectWiki({ projectId = 1 }: { projectId?: number }) {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [tree, setTree] = useState<WikiTreeItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [revisions, setRevisions] = useState<WikiRevision[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showRevisions, setShowRevisions] = useState(false);

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      const [allPages, treeData] = await Promise.all([
        getWikiPagesForProject(projectId),
        getWikiPageTree(projectId),
      ]);
      setPages(allPages);
      setTree(treeData);
    } catch (error) {
      console.error('Failed to load wiki:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const loadPage = async (pageId: number) => {
    try {
      const page = await getWikiPage(pageId);
      if (page) {
        setSelectedPage(page);
        setEditTitle(page.title);
        setEditContent(page.content);
        setEditMode(false);

        const revs = await getWikiRevisions(pageId);
        setRevisions(revs);
      }
    } catch (error) {
      console.error('Failed to load page:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadPages();
      return;
    }

    try {
      const results = await searchWikiPages(searchQuery, projectId);
      setPages(results);
    } catch (error) {
      console.error('Failed to search:', error);
    }
  };

  const handleCreate = async (title: string, content: string, parentId?: number) => {
    try {
      const page = await createWikiPage({
        project_id: projectId,
        title,
        content,
        parent_id: parentId,
      });
      toast.success('Page created');
      setShowNew(false);
      await loadPages();
      await loadPage(page.id);
    } catch (error) {
      console.error('Failed to create:', error);
      toast.error('Failed to create page');
    }
  };

  const handleSave = async () => {
    if (!selectedPage) return;

    try {
      await updateWikiPage({
        id: selectedPage.id,
        title: editTitle,
        content: editContent,
        changes_summary: 'Updated page',
      });
      toast.success('Page saved');
      setEditMode(false);
      await loadPage(selectedPage.id);
      await loadPages();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save page');
    }
  };

  const handleAddComment = async () => {
    if (!selectedPage || !commentText.trim()) return;

    try {
      await addWikiComment(selectedPage.id, commentText);
      toast.success('Comment added');
      setCommentText('');
    } catch (error) {
      console.error('Failed to comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const renderPageTree = (items: WikiTreeItem[], level = 0) => {
    return items.map(item => (
      <div key={item.page.id}>
        <div
          className={`flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded ${
            selectedPage?.id === item.page.id ? 'bg-primary/10' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => loadPage(item.page.id)}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1">{item.page.title}</span>
          {item.children.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {item.children.length}
            </Badge>
          )}
        </div>
        {item.children.length > 0 && (
          <div>
            {item.children.map(child => (
              <div
                key={child.id}
                className={`flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded ${
                  selectedPage?.id === child.id ? 'bg-primary/10' : ''
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                onClick={() => loadPage(child.id)}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{child.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Sidebar - Page Tree */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TreePine className="h-4 w-4" />
                Pages
              </CardTitle>
              <Dialog open={showNew} onOpenChange={setShowNew}>
                <DialogTrigger>
                  <Button size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Page</DialogTitle>
                  </DialogHeader>
                  <NewPageForm
                    onCreate={handleCreate}
                    parentPages={pages.filter(p => !p.parent_id)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tree.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No pages yet. Create one to get started.
              </div>
            ) : (
              <div className="pb-2">
                {renderPageTree(tree)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-4">
        {selectedPage ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editMode ? (
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="text-xl font-bold"
                      />
                    ) : (
                      <CardTitle>{selectedPage.title}</CardTitle>
                    )}
                    <CardDescription className="flex items-center gap-3 mt-1">
                      <span>Views: {selectedPage.views}</span>
                      <span>•</span>
                      <span>Last updated: {new Date(selectedPage.updated_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setShowRevisions(!showRevisions)}>
                          <History className="h-4 w-4 mr-1" />
                          History
                        </Button>
                        <Button size="sm" onClick={() => setEditMode(true)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                      {selectedPage.content}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddComment();
                      }}
                    />
                    <Button onClick={handleAddComment}>Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revisions */}
            {showRevisions && revisions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Revision History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revisions.map(rev => (
                      <div
                        key={rev.id}
                        className="flex items-center justify-between p-2 border rounded text-sm"
                      >
                        <span>{rev.changes_summary || 'Updated'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a page or create a new one to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NewPageForm({
  onCreate,
  parentPages,
}: {
  onCreate: (title: string, content: string, parentId?: number) => void;
  parentPages: WikiPage[];
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [parentId, setParentId] = useState<string>('');

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Page Title</Label>
        <Input
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., Architecture Overview"
        />
      </div>

      {parentPages.length > 0 && (
        <div>
          <Label htmlFor="parent">Parent Page (optional)</Label>
          <select
            id="parent"
            value={parentId}
            onChange={e => setParentId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">None (Top Level)</option>
            {parentPages.map(p => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={10}
          placeholder="Start writing your wiki page..."
        />
      </div>

      <Button
        onClick={() => onCreate(title, content, parentId ? Number(parentId) : undefined)}
        className="w-full"
        disabled={!title.trim() || !content.trim()}
      >
        Create Page
      </Button>
    </div>
  );
}