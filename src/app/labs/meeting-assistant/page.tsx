"use client";

import { useState } from "react";
import { MeetingRecorder } from "@/components/task/meeting-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, RefreshCw, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface MeetingActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: "high" | "medium" | "low";
  confidence: number;
  context: string;
}

export default function MeetingAssistantPage() {
  const [transcript, setTranscript] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split("T")[0]);

  const extractActionItems = async () => {
    if (!transcript.trim()) {
      toast.error("Please paste a meeting transcript or record a meeting first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "extractActionItems",
          input: {
            transcript,
            title: meetingTitle,
            date: meetingDate,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActionItems(data.actionItems || []);
        toast.success(`Extracted ${data.actionItems?.length || 0} action item(s)`);
      } else {
        throw new Error("Failed to extract action items");
      }
    } catch (error) {
      // Fallback to local extraction
      const { extractActionItems: localExtract } = await import("@/lib/ai/meeting-transcription");
      const items = await localExtract(transcript, meetingTitle);
      setActionItems(items);
      toast.success(`Extracted ${items.length} action item(s)`);
    } finally {
      setLoading(false);
    }
  };

  const convertToTasks = async () => {
    if (actionItems.length === 0) return;

    try {
      // In a real implementation, this would call the task creation API
      toast.success(`Would create ${actionItems.length} task(s) from action items`);
    } catch (error) {
      toast.error("Failed to convert to tasks");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageCircle className="h-8 w-8" />
          Meeting Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Transcribe meetings and extract action items automatically
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Input</CardTitle>
              <CardDescription>
                Paste your meeting transcript or use voice recording
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Title</label>
                <Input
                  placeholder="e.g., Q3 Planning Meeting"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Date</label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Transcript</label>
                <Textarea
                  placeholder="Paste your meeting transcript here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                />
              </div>

              <Button onClick={extractActionItems} disabled={loading || !transcript.trim()}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Extract Action Items
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Or Record Live</CardTitle>
              <CardDescription>
                Record a meeting directly in your browser
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingRecorder
                onTranscription={(transcript) => {
                  setTranscript(transcript);
                  toast.success("Meeting recorded and transcribed");
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Extracted Action Items
                {actionItems.length > 0 && (
                  <Badge variant="secondary">{actionItems.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and convert to tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    No action items extracted yet. Paste a transcript or record a meeting.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionItems.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{item.description}</h4>
                        <Badge
                          variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {item.priority}
                        </Badge>
                      </div>

                      {item.dueDate && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Confidence: {Math.round(item.confidence * 100)}%</span>
                        {item.assignee && <span>Assignee: {item.assignee}</span>}
                      </div>
                    </div>
                  ))}

                  {actionItems.length > 0 && (
                    <Button
                      onClick={convertToTasks}
                      className="w-full"
                      variant="outline"
                    >
                      Convert all to Tasks
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}