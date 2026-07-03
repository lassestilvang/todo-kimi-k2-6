"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Trash2, Image, FileText, FileArchive, Plus } from "lucide-react";
import type { TaskWithRelations, TaskAttachment } from "@/types";

interface TaskAttachmentsProps {
  task?: TaskWithRelations;
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
}

export function TaskAttachments({ task, onAttachmentsChange }: TaskAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task?.id) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", String(task.id));

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const attachment = await response.json();
        onAttachmentsChange([...(task.attachments || []), attachment]);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload:", error);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (attachmentId: number) => {
    try {
      const response = await fetch(`/api/attachments?id=${attachmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onAttachmentsChange(
          (task?.attachments || []).filter((a) => a.id !== attachmentId)
        );
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimeType === "application/pdf") return <FileText className="h-4 w-4" />;
    if (mimeType.includes("zip") || mimeType.includes("archive")) return <FileArchive className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Attachments</Label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <Input
            type="file"
            onChange={handleUpload}
            disabled={isUploading || !task?.id}
            className="hidden"
            id="file-upload-attachments"
          />
          <Label
            htmlFor="file-upload-attachments"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">
              {task?.id ? (isUploading ? "Uploading..." : "Click to upload") : "Save task first"}
            </span>
          </Label>
        </div>
      </div>

      {task?.attachments && task.attachments.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Files ({task.attachments.length})</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {task.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(att.mime_type)}
                  <div>
                    <div className="text-sm font-medium">{att.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {(att.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(att.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}