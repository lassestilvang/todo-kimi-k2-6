'use client';

import { useState } from 'react';
import {
  Download,
  Upload,
  FileJson,
  FileText,
  X,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { exportData, exportCsv, importData, checkImportConflicts, type ExportDataSchema, type ConflictCheckResult } from '@/lib/actions';
import { validateExportData } from '@/lib/validation/export';
import { exportToPdf } from '@/lib/export/pdf';

interface ImportExportProps {
  onRefresh: () => void;
}

type ExportFormat = 'json' | 'csv' | 'pdf';
type ImportSource = 'file' | 'paste' | 'template';
type ConflictStrategy = 'replace' | 'merge' | 'skip_conflicts';

export function ImportExport({ onRefresh }: ImportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [jsonData, setJsonData] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [importSource, setImportSource] = useState<ImportSource>('file');
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('replace');
  const [conflictPreview, setConflictPreview] = useState<ConflictCheckResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'json') {
        const data = await exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('JSON export downloaded');
      } else if (exportFormat === 'csv') {
        const csv = await exportCsv();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskflow-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV export downloaded');
      } else if (exportFormat === 'pdf') {
        // Fetch data first, then export to PDF
        const data = await exportData();
        await exportToPdf({
          tasks: data.tasks,
          lists: data.lists,
          filename: `taskflow-export-${new Date().toISOString().split('T')[0]}.pdf`,
        });
        toast.success('PDF export downloaded');
      }
    } catch (error) {
      toast.error('Export failed');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (importSource === 'file' && !file) return;
    if (importSource === 'paste' && !jsonData.trim()) return;

    setIsImporting(true);
    try {
      let data: unknown;

      if (importSource === 'file') {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const text = await file!.text();
        data = JSON.parse(text);
      } else {
        data = JSON.parse(jsonData);
      }

      // Validate the imported data
      const validation = validateExportData(data);
      if (!validation.valid) {
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      const result = await importData(data as ExportDataSchema, { conflictStrategy });

      let message = `Imported ${result.tasks} tasks, ${result.lists} lists, ${result.labels} labels`;
      if (result.skipped > 0) {
        message += `, skipped ${result.skipped} items with conflicts`;
      }
      if (result.errors.length > 0) {
        message += `, ${result.errors.length} errors`;
        toast.warning(message);
      } else {
        toast.success(message);
      }

      setJsonData('');
      setFile(null);
      onRefresh();
    } catch (error) {
      toast.error('Import failed. Check the file format.');
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const checkConflicts = async () => {
    if (importSource === 'file' && !file) return;
    if (importSource === 'paste' && !jsonData.trim()) return;

    try {
      let data: unknown;

      if (importSource === 'file') {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const text = await file!.text();
        data = JSON.parse(text);
      } else {
        data = JSON.parse(jsonData);
      }

      // Validate first
      const validation = validateExportData(data);
      if (!validation.valid) {
        toast.error(`Validation failed: ${validation.errors.join(', ')}`);
        return;
      }

      // Check conflicts
      const conflicts = await checkImportConflicts(data as ExportDataSchema);
      setConflictPreview(conflicts);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to check conflicts. Check the file format.');
      console.error(error);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Download className="h-4 w-4 mr-1.5" />
        Export / Import
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Data Export / Import</DialogTitle>
            <DialogDescription>
              Export your tasks to backup files or import data from another
              source.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex space-x-1 mb-4">
              <button
                className={`px-3 py-1 text-sm rounded ${activeTab === 'export' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                onClick={() => setActiveTab('export')}
              >
                Export
              </button>
              <button
                className={`px-3 py-1 text-sm rounded ${activeTab === 'import' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                onClick={() => setActiveTab('import')}
              >
                Import
              </button>
            </div>

            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={exportFormat === 'json' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setExportFormat('json')}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button
                      variant={exportFormat === 'csv' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setExportFormat('csv')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant={exportFormat === 'pdf' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setExportFormat('pdf')}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JSON includes all data (tasks, lists, labels, templates).
                    CSV includes tasks only. PDF is optimized for printing.
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

            {activeTab === 'import' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Import Source</Label>
                  <Select
                    value={importSource}
                    onValueChange={v => setImportSource(v as ImportSource)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">Upload File</SelectItem>
                      <SelectItem value="paste">Paste JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {importSource === 'file' && (
                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      disabled={isImporting}
                    />
                  </div>
                )}

                {importSource === 'paste' && (
                  <div className="relative">
                    <Label>Paste JSON Data</Label>
                    <Textarea
                      placeholder="Paste exported JSON here..."
                      rows={6}
                      value={jsonData}
                      onChange={e => setJsonData(e.target.value)}
                      disabled={isImporting}
                    />
                    {jsonData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-6 w-6 p-0"
                        onClick={() => setJsonData('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Conflict Resolution</Label>
                  <Select
                    value={conflictStrategy}
                    onValueChange={v => setConflictStrategy(v as ConflictStrategy)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replace">Replace All (default)</SelectItem>
                      <SelectItem value="merge">Merge (update existing, keep new)</SelectItem>
                      <SelectItem value="skip_conflicts">Skip Existing (keep current)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how to handle existing data with the same IDs
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkConflicts}
                  disabled={isImporting}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Conflicts
                </Button>

                {showPreview && conflictPreview && conflictPreview.hasConflicts && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Potential conflicts detected
                    </p>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                      {conflictPreview.lists.duplicates > 0 && (
                        <li>{conflictPreview.lists.duplicates} lists have duplicate IDs</li>
                      )}
                      {conflictPreview.labels.duplicates > 0 && (
                        <li>{conflictPreview.labels.duplicates} labels have duplicate IDs</li>
                      )}
                      {conflictPreview.tasks.duplicates > 0 && (
                        <li>{conflictPreview.tasks.duplicates} tasks have duplicate IDs</li>
                      )}
                      {conflictPreview.templates.duplicates > 0 && (
                        <li>{conflictPreview.templates.duplicates} templates have duplicate IDs</li>
                      )}
                      {conflictPreview.time_entries.duplicates > 0 && (
                        <li>{conflictPreview.time_entries.duplicates} time entries have duplicate IDs</li>
                      )}
                    </ul>
                    {conflictStrategy === 'skip_conflicts' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        Only new items will be imported; existing items will be kept.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleImport}
                  disabled={
                    isImporting ||
                    (importSource === 'file' && !file) ||
                    (importSource === 'paste' && !jsonData.trim())
                  }
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
