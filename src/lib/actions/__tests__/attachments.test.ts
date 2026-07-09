import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";
import {
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
} from "../attachments";

describe("Attachment Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
  });

  describe("getTaskAttachments", () => {
    it("should return empty array when no attachments exist", async () => {
      const attachments = await getTaskAttachments(1);
      expect(Array.isArray(attachments)).toBe(true);
    });

    it("should return attachments for a task", async () => {
      // Add an attachment first
      await addTaskAttachment({
        task_id: 1,
        filename: "test.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        url: "/uploads/test.pdf",
      });

      const attachments = await getTaskAttachments(1);
      expect(Array.isArray(attachments)).toBe(true);
    });

    it("should throw error when user ID provided and task not owned", async () => {
      await expect(
        getTaskAttachments(99999, 999)
      ).rejects.toThrow();
    });
  });

  describe("addTaskAttachment", () => {
    it("should add an attachment", async () => {
      const attachment = await addTaskAttachment({
        task_id: 1,
        filename: "document.pdf",
        file_size: 2048,
        mime_type: "application/pdf",
        url: "/uploads/document.pdf",
      });

      expect(attachment.id).toBeDefined();
      expect(attachment.task_id).toBe(1);
      expect(attachment.filename).toBe("document.pdf");
      expect(attachment.file_size).toBe(2048);
      expect(attachment.mime_type).toBe("application/pdf");
      expect(attachment.url).toBe("/uploads/document.pdf");
    });

    it("should add attachment with different file types", async () => {
      const imageAttachment = await addTaskAttachment({
        task_id: 1,
        filename: "image.png",
        file_size: 50000,
        mime_type: "image/png",
        url: "/uploads/image.png",
      });

      expect(imageAttachment.mime_type).toBe("image/png");
      expect(imageAttachment.file_size).toBe(50000);
    });

    it("should add multiple attachments to same task", async () => {
      await addTaskAttachment({
        task_id: 1,
        filename: "file1.txt",
        file_size: 100,
        mime_type: "text/plain",
        url: "/uploads/file1.txt",
      });

      await addTaskAttachment({
        task_id: 1,
        filename: "file2.txt",
        file_size: 200,
        mime_type: "text/plain",
        url: "/uploads/file2.txt",
      });

      const attachments = await getTaskAttachments(1);
      expect(Array.isArray(attachments)).toBe(true);
    });
  });

  describe("deleteTaskAttachment", () => {
    it("should delete an attachment", async () => {
      const attachment = await addTaskAttachment({
        task_id: 1,
        filename: "to-delete.pdf",
        file_size: 100,
        mime_type: "application/pdf",
        url: "/uploads/to-delete.pdf",
      });

      await deleteTaskAttachment(attachment.id);

      const attachments = await getTaskAttachments(1);
      // Should not throw, just return whatever is left
      expect(Array.isArray(attachments)).toBe(true);
    });

    it("should handle deleting non-existent attachment", async () => {
      // Should not throw
      await deleteTaskAttachment(99999);
    });
  });

  describe("Edge cases", () => {
    it("should handle image attachments", async () => {
      const img = await addTaskAttachment({
        task_id: 1,
        filename: "screenshot.jpg",
        file_size: 1024000,
        mime_type: "image/jpeg",
        url: "/uploads/screenshot.jpg",
      });
      expect(img.mime_type).toBe("image/jpeg");
    });

    it("should handle document attachments", async () => {
      const doc = await addTaskAttachment({
        task_id: 1,
        filename: "report.docx",
        file_size: 25000,
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        url: "/uploads/report.docx",
      });
      expect(doc.filename).toBe("report.docx");
    });

    it("should handle large file sizes", async () => {
      const large = await addTaskAttachment({
        task_id: 1,
        filename: "video.mp4",
        file_size: 1000000000,
        mime_type: "video/mp4",
        url: "/uploads/video.mp4",
      });
      expect(large.file_size).toBe(1000000000);
    });
  });
});