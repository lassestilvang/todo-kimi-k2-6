// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCollaborateTab } from '../task-collaborate-tab';
import type { TaskWithRelations } from '@/types';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-testid={`button-${variant || 'default'}`}>{children}</button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div data-testid="select">{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>View</span>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder }: { placeholder: string }) => <input placeholder={placeholder} data-testid="input" />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid={`badge-${variant || 'default'}`}>{children}</span>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

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
  attachments: [],
};

const mockTaskWithAssignee: TaskWithRelations = {
  ...mockTask,
  assignee: {
    id: 2,
    email: 'assignee@example.com',
    name: 'Assignee User',
    created_at: new Date().toISOString(),
  },
};

const mockTaskWithAssigneeNoName: TaskWithRelations = {
  ...mockTask,
  assignee: {
    id: 3,
    email: 'no-name@example.com',
    name: null,
    created_at: new Date().toISOString(),
  },
};

describe('TaskCollaborateTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render collaboration section', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText('Collaboration')).toBeInTheDocument();
  });

  it('should render share description', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText(/Share this task with team members/)).toBeInTheDocument();
  });

  it('should render user email input placeholder', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByPlaceholderText('Enter user email...')).toBeInTheDocument();
  });

  it('should render share permission dropdown', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText('Share with Users')).toBeInTheDocument();
  });

  it('should render view and edit permission options', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    // View and Edit appear in SelectValue and SelectItem - use getAllByText since there are duplicates
    const viewElements = screen.getAllByText('View');
    const editElements = screen.getAllByText('Edit');
    expect(viewElements.length).toBeGreaterThan(0);
    expect(editElements.length).toBeGreaterThan(0);
  });

  it('should render invite button', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText('Invite')).toBeInTheDocument();
  });

  it('should render current collaborators section', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText('Current Collaborators')).toBeInTheDocument();
  });

  it('should render generate share link button', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText('Generate Share Link')).toBeInTheDocument();
  });

  it('should render share link description', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    expect(screen.getByText(/Anyone with this link can view the task/)).toBeInTheDocument();
  });

  it('should display assignee when task has assignee', () => {
    render(<TaskCollaborateTab task={mockTaskWithAssignee} />);
    expect(screen.getByText('Assignee User')).toBeInTheDocument();
  });

  it('should display assignee email when name is null', () => {
    render(<TaskCollaborateTab task={mockTaskWithAssigneeNoName} />);
    expect(screen.getByText('no-name@example.com')).toBeInTheDocument();
  });

  it('should not display collaborators section when no assignee', () => {
    render(<TaskCollaborateTab task={mockTask} />);
    // The badge area will be empty but the label still shows
    const badges = screen.queryAllByTestId(/badge-/);
    expect(badges.length).toBe(0);
  });

  it('should copy share link to clipboard when clicked', () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    const mockToast = vi.mocked(vi.doMock('sonner', () => ({ toast: { success: vi.fn() } }))?.toast);

    render(<TaskCollaborateTab task={mockTask} />);

    const generateButton = screen.getByText('Generate Share Link');
    fireEvent.click(generateButton);

    // After clicking, clipboard.writeText should be called
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('should generate share link when clicked', () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    // Mock clipboard API
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
    });

    render(<TaskCollaborateTab task={mockTask} />);

    const generateButton = screen.getByText('Generate Share Link');
    fireEvent.click(generateButton);

    // Verify share link was written to clipboard
    expect(mockClipboard.writeText).toHaveBeenCalled();
    const callArgs = mockClipboard.writeText.mock.calls[0]?.[0];
    expect(callArgs).toMatch(/http:\/\/.*\/share\/.*/);

    // Restore
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
  });

  it('should have correct structure for sharing UI', () => {
    render(<TaskCollaborateTab task={mockTask} />);

    // Check for key UI elements
    expect(screen.getByText('Share with Users')).toBeInTheDocument();
    expect(screen.getByText('Current Collaborators')).toBeInTheDocument();
    expect(screen.getByText('Generate Share Link')).toBeInTheDocument();
  });
});