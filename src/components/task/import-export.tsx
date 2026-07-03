"use client";

import { useState } from "react";
import { Download, Upload, FileJson, FileText, X, FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { exportData, exportCsv, importData } from "@/lib/actions";
import { exportToPdf } from "@/lib/export/pdf";

interface ImportExportProps {
  onRefresh: () => void;
}

type ExportFormat = "json" | "csv" | "pdf";
type ImportSource = "file" | "paste" | "template";

export function ImportExport({ onRefresh }: ImportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [jsonData, setJsonData] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [importSource, setImportSource] = useState<ImportSource>("file");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === "json") {
        const data = await exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `taskflow-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("JSON export downloaded");
      } else if (exportFormat === "csv") {
        const csv = await exportCsv();
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `taskflow-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV export downloaded");
      } else if (exportFormat === "pdf") {
        // Fetch data first, then export to PDF
        const data = await exportData();
        await exportToPdf({
          tasks: data.tasks,
          lists: data.lists,
          filename: `taskflow-export-${new Date().toISOString().split("T")[0]}.pdf`,
        });
        toast.success("PDF export downloaded");
      }
    } catch (error) {
      toast.error("Export failed");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (importSource === "file" && !file) return;
    if (importSource === "paste" && !jsonData.trim()) return;

    setIsImporting(true);
    try {
      let data: any;

      if (importSource === "file") {
        const text = await file!.text();
        data = JSON.parse(text);
      } else {
        data = JSON.parse(jsonData);
      }

      const result = await importData(data);
      toast.success(`Imported ${result.tasks} tasks, ${result.lists} lists, ${result.labels} labels`);
      setJsonData("");
      setFile(null);
      onRefresh();
    } catch (error) {
      toast.error("Import failed. Check the file format.");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleTemplateExport = async (templateId: number) => {
    // Export a single template
    try {
      const response = await fetch(`/api/templates/${templateId}/export`);
      if (!response.ok) throw new Error("Failed to export template");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-${templateId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Template export failed");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Download className="h-4 w-4 mr-1.5" />
        Export / Import
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Data Export / Import</DialogTitle>
            <DialogDescription>
              Export your tasks to backup files or import data from another source.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex space-x-1 mb-4">
              <button
                className={`px-3 py-1 text-sm rounded ${activeTab === "export" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setActiveTab("export")}
              >
                Export
              </button>
              <button
                className={`px-3 py-1 text-sm rounded ${activeTab === "import" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setActiveTab("import")}
              >
                Import
              </button>
            </div>

            {activeTab === "export" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={exportFormat === "json" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setExportFormat("json")}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button
                      variant={exportFormat === "csv" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setExportFormat("csv")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant={exportFormat === "pdf" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setExportFormat("pdf")}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JSON includes all data (tasks, lists, labels, templates). CSV includes tasks only. PDF is optimized for printing.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Export
                    </>
                  )}
                </Button>
              </div>
            )}

            {activeTab === "import" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Import Source</Label>
                  <Select value={importSource} onValueChange={(v) => setImportSource(v as ImportSource)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">Upload File</SelectItem>
                      <SelectItem value="paste">Paste JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {importSource === "file" && (
                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={isImporting}
                    />
                  </div>
                )}

                {importSource === "paste" && (
                  <div className="relative">
                    <Label>Paste JSON Data</Label>
                    <Textarea
                      placeholder="Paste exported JSON here..."
                      rows={6}
                      value={jsonData}
                      onChange={(e) => setJsonData(e.target.value)}
                      disabled={isImporting}
                    />
                    {jsonData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-6 w-6 p-0"
                        onClick={() => setJsonData("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleImport}
                  disabled={isImporting || (importSource === "file" && !file) || (importSource === "paste" && !jsonData.trim())}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}