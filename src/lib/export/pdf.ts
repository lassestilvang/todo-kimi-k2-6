/**
 * PDF Export Utilities
 * Uses jsPDF for client-side PDF generation
 */

import type { TaskWithRelations, List } from "@/types";

interface ExportOptions {
  tasks: TaskWithRelations[];
  lists: List[];
  filename?: string;
}

/**
 * Export tasks to a PDF file
 * Note: This runs in the browser and uses the jsPDF library
 */
export async function exportToPdf({ tasks, lists, filename }: ExportOptions): Promise<void> {
  // Dynamic import for jsPDF (only available in browser)
  const jsPDF = (await import("jspdf")).jsPDF;
  const doc = new jsPDF();

  const pageSize = doc.internal.pageSize;
  const maxY = pageSize.getHeight() - 20;
  let y = 20;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TaskFlow Export", 20, y);
  y += 10;

  // Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toISOString().split("T")[0]}`, 20, y);
  y += 5;
  doc.text(`Total Tasks: ${tasks.length}`, 20, y);
  y += 5;
  doc.text(`Completed: ${tasks.filter(t => t.completed).length}`, 20, y);
  y += 10;

  // Tasks section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Tasks", 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const getPriorityColor = (priority: string): [number, number, number] => {
    switch (priority) {
      case "critical": return [220, 38, 38]; // red-500
      case "high": return [234, 88, 88]; // red-400
      case "medium": return [245, 130, 40]; // amber
      case "low": return [59, 130, 255]; // blue-500
      default: return [100, 100, 100]; // gray
    }
  };

  for (const task of tasks) {
    // Check if we need a new page
    if (y > maxY - 15) {
      doc.addPage();
      y = 20;
    }

    // Task name with status
    const status = task.completed ? "✓" : "○";
    const prefix = `[${status}] `;
    const priorityColor = getPriorityColor(task.priority);

    doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
    doc.text(`${prefix}${task.name}`, 20, y);
    y += 5;

    doc.setTextColor(0, 0, 0);

    // Description
    if (task.description) {
      const descLines = doc.splitTextToSize(`  ${task.description}`, pageSize.getWidth() - 30);
      doc.text(descLines, 25, y);
      y += descLines.length * 4;
    }

    // Date and priority
    const infoParts: string[] = [];
    if (task.date) infoParts.push(`Date: ${task.date}`);
    if (task.priority !== "none") infoParts.push(`Priority: ${task.priority}`);

    if (infoParts.length > 0) {
      doc.setTextColor(100, 100, 100);
      doc.text(`  ${infoParts.join(" | ")}`, 25, y);
      doc.setTextColor(0, 0, 0);
    }

    y += 6;
  }

  // Lists section
  if (lists.length > 0) {
    y += 10;
    if (y > maxY - 15) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Lists", 20, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const list of lists) {
      doc.text(`${list.emoji} ${list.name}`, 20, y);
      y += 5;
    }
  }

  // Save the PDF
  const defaultFilename = `taskflow-export-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename || defaultFilename);
}