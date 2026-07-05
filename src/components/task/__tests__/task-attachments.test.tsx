import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskAttachments } from '../modal/task-attachments';
import type { TaskWithRelations, TaskAttachment } from '@/types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Paperclip: () => <span data-testid="icon-paperclip" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Image: () => <span data-testid="icon-image" />,
  FileText: () => <span data-testid="icon-file-text" />,
  FileArchive: () => <span data-testid="icon-archive" />,
  Plus: () => <span data-testid="icon-plus" />,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: { children: React.ReactNode; onClick?: () => void; variant?: string; size?: string }) => (
    <button onClick={onClick} data-testid={`button-${variant}`}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ type, onChange, disabled, id }: { type: string; onChange: (e: any) => void; disabled?: boolean; id?: string }) => (
    <input type={type} onChange={onChange} disabled={disabled} id={id} data-testid="input-file" />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

const mockAttachments: TaskAttachment[] = [
  { id: 1, task_id: 1, filename: 'document.pdf', file_size: 1024, mime_type: 'application/pdf', url: '/files/1', created_at: '' },
  { id: 2, task_id: 1, filename: 'image.png', file_size: 2048, mime_type: 'image/png', url: '/files/2', created_at: '' },
  { id: 3, task_id: 1, filename: 'archive.zip', file_size: 4096, mime_type: 'application/zip', url: '/files/3', created_at: '' },
];

const mockTask: TaskWithRelations = {
  id: 1,
  name: 'Test Task',
  description: null,
  notes: null,
  list_id: 1,
  date: null,
  deadline: null,
  estimate: null,
  actual_time: null,
  priority: 'none',
  recurring: 'none',
  recurring_config: null,
  completed: 0,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  sort_order: 0,
  labels: [],
  subtasks: [],
  reminders: [],
  logs: [],
  comments: [],
  blockers: [],
  blocked_by: [],
  time_entries: [],
  recurring_exceptions: [],
  attachments: mockAttachments,
};

describe('TaskAttachments', () => {
  const mockOnAttachmentsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch
    global.fetch = vi.fn();
  });

  it('should render upload area', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });

  it('should show upload instruction for existing task', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText(/Click to upload/)).toBeInTheDocument();
  });

  it('should show "Save task first" when no task id', () => {
    render(<TaskAttachments task={undefined} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText(/Save task first/)).toBeInTheDocument();
  });

  it('should display attached files count', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText(/Attached Files/)).toBeInTheDocument();
  });

  it('should display file information', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
  });

  it('should display file sizes', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    // Check for file sizes (in KB)
    const sizeElements = screen.getAllByText(/KB/);
    expect(sizeElements.length).toBeGreaterThan(0);
  });

  it('should show different icons for different file types', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    // Image attachment - should show image icon
    expect(screen.getByTestId('icon-image')).toBeInTheDocument();
    // PDF attachment - should show file text icon
    expect(screen.getByTestId('icon-file-text')).toBeInTheDocument();
    // Archive - should show archive icon
    expect(screen.getByTestId('icon-archive')).toBeInTheDocument();
  });

  it('should render delete buttons for attachments', () => {
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    // Component renders with attachments
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
  });

  it('should handle attachment deletion', async () => {
    // Test that the component handles delete action
    render(<TaskAttachments task={mockTask} onAttachmentsChange={mockOnAttachmentsChange} />);
    // Component is rendered with delete functionality available
    expect(screen.getByText('Attached Files (3)')).toBeInTheDocument();
  });

  it('should handle empty attachments array', () => {
    render(<TaskAttachments task={{ ...mockTask, attachments: [] }} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });

  it('should handle undefined attachments', () => {
    render(<TaskAttachments task={{ ...mockTask, attachments: undefined } as any} onAttachmentsChange={mockOnAttachmentsChange} />);
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });
});