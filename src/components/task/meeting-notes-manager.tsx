'use client';

import { useState, useEffect } from 'react';
import {
  MessageCircle,
  Plus,
  Calendar,
  Users,
  FileText,
  CheckSquare,
  Trash2,
  Sparkles,
  ArrowRight,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface MeetingNotes {
  id: number;
  user_id: number;
  title: string;
  notes: string;
  date: string;
  participants?: string;
  action_items?: string;
  decisions?: string;
  created_at: string;
  updated_at: string;
}

interface ActionItem {
  id: number;
  meeting_notes_id: number;
  description: string;
  due_date?: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  completed: number;
  created_at: string;
}

export function MeetingNotesManager() {
  const [meetings, setMeetings] = useState<MeetingNotes[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingNotes | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // New meeting form
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newParticipants, setNewParticipants] = useState('');

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/meeting-notes');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingDetails = async (meeting: MeetingNotes) => {
    setSelectedMeeting(meeting);
    try {
      const response = await fetch(`/api/meeting-notes/${meeting.id}`);
      if (response.ok) {
        const data = await response.json();
        setActionItems(data.actionItems || []);
      }
    } catch (error) {
      console.error('Failed to load meeting details:', error);
    }
  };

  const createMeeting = async () => {
    if (!newTitle.trim() || !newNotes.trim()) {
      toast.error('Please enter a title and notes');
      return;
    }

    try {
      const response = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          notes: newNotes,
          date: newDate,
          participants: newParticipants,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Meeting created with ${data.actionItems?.length || 0} action items`
        );
        setShowNewDialog(false);
        setNewTitle('');
        setNewNotes('');
        setNewParticipants('');
        await loadMeetings();
        if (data.meeting) {
          await loadMeetingDetails(data.meeting);
        }
      } else {
        throw new Error('Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create meeting');
    }
  };

  const parseActionItems = async () => {
    if (!selectedMeeting) return;

    setAnalyzing(true);
    try {
      const response = await fetch(`/api/meeting-notes/${selectedMeeting.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse' }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Extracted ${data.actionItems?.length || 0} action items`);
        await loadMeetingDetails(selectedMeeting);
      }
    } catch (error) {
      console.error('Error parsing:', error);
      toast.error('Failed to parse action items');
    } finally {
      setAnalyzing(false);
    }
  };

  const convertToTasks = async () => {
    if (!selectedMeeting) return;

    try {
      const response = await fetch(`/api/meeting-notes/${selectedMeeting.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `Created ${data.converted} tasks (${data.existing} already existed)`
        );
      }
    } catch (error) {
      console.error('Error converting:', error);
      toast.error('Failed to convert to tasks');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Meetings List */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Meeting Notes</CardTitle>
              <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogTrigger>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Meeting Notes</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="e.g., Q3 Planning Meeting"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="participants">Participants (comma-separated)</Label>
                      <Input
                        id="participants"
                        value={newParticipants}
                        onChange={e => setNewParticipants(e.target.value)}
                        placeholder="John Doe, Jane Smith"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Meeting Notes</Label>
                      <Textarea
                        id="notes"
                        value={newNotes}
                        onChange={e => setNewNotes(e.target.value)}
                        rows={8}
                        placeholder="Paste or write meeting notes..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowNewDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={createMeeting}>
                        Create & Extract Action Items
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No meeting notes yet</p>
                <p className="text-xs mt-1">Create one to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map(meeting => (
                  <div
                    key={meeting.id}
                    onClick={() => loadMeetingDetails(meeting)}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedMeeting?.id === meeting.id ? 'border-primary bg-muted' : ''
                    }`}
                  >
                    <h4 className="font-medium text-sm">{meeting.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{meeting.date}</span>
                      {meeting.participants && (
                        <>
                          <Users className="h-3 w-3 ml-1" />
                          <span>{meeting.participants.split(',').length}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meeting Details */}
      <div className="lg:col-span-2 space-y-4">
        {selectedMeeting ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedMeeting.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {selectedMeeting.date}
                      {selectedMeeting.participants && (
                        <>
                          <Users className="h-3 w-3 ml-2" />
                          {selectedMeeting.participants}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={parseActionItems}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <>Analyzing...</>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Re-parse
                        </>
                      )}
                    </Button>
                    {actionItems.length > 0 && (
                      <Button size="sm" onClick={convertToTasks}>
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Convert to Tasks
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {selectedMeeting.notes}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            {actionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Action Items
                    <Badge variant="secondary">{actionItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {actionItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Badge
                          className={`${getPriorityColor(item.priority)} text-white mt-0.5`}
                        >
                          {item.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{item.description}</p>
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {item.due_date}
                            </p>
                          )}
                        </div>
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
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a meeting or create a new one to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}