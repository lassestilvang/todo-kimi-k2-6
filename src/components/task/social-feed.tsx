'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Trophy,
  CheckCircle2,
  Sparkles,
  Users,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  getFeed,
  likeFeedPost,
  commentOnFeedPost,
  getFeedComments,
} from '@/lib/actions/social-feed';

interface FeedPost {
  id: number;
  user_id: number;
  activity_type: string;
  title: string;
  description: string;
  metadata: string | null;
  visibility: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface FeedComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

export function SocialFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, FeedComment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const feed = await getFeed({ limit: 20 });
      setPosts(feed);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLike = async (postId: number) => {
    try {
      await likeFeedPost(postId);
      // Update local state
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
      ));
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const handleComment = async (postId: number) => {
    const content = newComment[postId];
    if (!content?.trim()) return;

    try {
      await commentOnFeedPost(postId, content);
      setNewComment({ ...newComment, [postId]: '' });

      // Reload comments
      const updatedComments = await getFeedComments(postId);
      setComments({ ...comments, [postId]: updatedComments });

      // Update comment count
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    } catch (error) {
      console.error('Failed to comment:', error);
    }
  };

  const toggleComments = async (postId: number) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      const commentsList = await getFeedComments(postId);
      setComments({ ...comments, [postId]: commentsList });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'streak':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'milestone':
        return <Sparkles className="h-5 w-5 text-purple-500" />;
      case 'achievement':
        return <Target className="h-5 w-5 text-blue-500" />;
      default:
        return <Users className="h-5 w-5 text-gray-500" />;
    }
  };

  const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Activity Feed
          </CardTitle>
          <CardDescription>
            See what your team is accomplishing
          </CardDescription>
        </CardHeader>
      </Card>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity yet. Complete tasks to share progress with your team!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map(post => (
          <Card key={post.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-full">
                  {getActivityIcon(post.activity_type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{post.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {post.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeAgo(post.created_at)}
                  </p>
                </div>
                {post.visibility === 'public' && (
                  <Badge variant="outline" className="text-xs">
                    Public
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Action buttons */}
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id)}
                >
                  <Heart className="h-4 w-4 mr-1" />
                  {post.likes_count}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post.comments_count}
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments */}
              {expandedPost === post.id && (
                <div className="space-y-3 border-t pt-3">
                  {/* Add comment */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={newComment[post.id] || ''}
                      onChange={e =>
                        setNewComment({
                          ...newComment,
                          [post.id]: e.target.value,
                        })
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleComment(post.id);
                      }}
                    />
                    <Button size="sm" onClick={() => handleComment(post.id)}>
                      Send
                    </Button>
                  </div>

                  {/* Comments list */}
                  {comments[post.id]?.map(comment => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <Avatar className="h-6 w-6" />
                      <div className="flex-1 bg-muted rounded-lg p-2">
                        <p className="text-sm">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo(comment.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}