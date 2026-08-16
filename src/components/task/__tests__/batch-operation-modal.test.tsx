import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchOperationModal } from '../batch-operation-modal';
import type { Task } from '@/types';

const mockTasks: Task[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Task 1',
    description: 'Description 1',
    priority: 'high',
    completed: false,
    completed_at: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    date: '2024-01-15',
    deadline: '2024-01-20',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: 1,
    recurring: 'none',
    recurring_config: null,
    sort_order: 0,
    archived: false,
  },
  {
    id: 2,
    user_id: 1,
    name: 'Task 2',
    description: 'Description 2',
    priority: 'medium',
    completed: true,
    completed_at: '2024-01-10',
    created_at: '2024-01-01',
    updated_at: '2024-01-10',
    date: '2024-01-10',
    deadline: '2024-01-15',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: 1,
    recurring: 'none',
    recurring_config: null,
    sort_order: 1,
    archived: false,
  },
];

const mockLists = [
  { id: 1, name: 'Inbox' },
  { id: 2, name: 'Work' },
  { id: 3, name: 'Personal' },
];

const mockLabels = [
  { id: 1, name: 'Important' },
  { id: 2, name: 'Urgent' },
];

describe('BatchOperationModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with empty selection', () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set()}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    expect(screen.getByText('Batch Operations')).toBeInTheDocument();
  });

  it('shows correct selection summary', () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1, 2])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays pending and completed task counts', () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1, 2])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('allows selecting complete operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const completeButton = screen.getByText('Mark Complete');
    fireEvent.click(completeButton);
  });

  it('allows selecting delete operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
  });

  it('shows confirmation warning for delete operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      // The delete operation should show a warning section
      expect(
        screen.getByText(/This action cannot be undone/i)
      ).toBeInTheDocument();
    });
  });

  it('allows selecting archive operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const archiveButton = screen.getByText('Archive');
    fireEvent.click(archiveButton);
  });

  it('allows selecting move operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const moveButton = screen.getByText('Move to List');
    fireEvent.click(moveButton);
  });

  it('allows selecting set priority operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const priorityButton = screen.getByText('Set Priority');
    fireEvent.click(priorityButton);
  });

  it('allows selecting add labels operation', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const labelsButton = screen.getByText('Add Labels');
    fireEvent.click(labelsButton);
  });

  it('displays label selection options', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const labelsButton = screen.getByText('Add Labels');
    fireEvent.click(labelsButton);

    await waitFor(() => {
      expect(screen.getByText('Select Labels')).toBeInTheDocument();
      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  it('displays warning for destructive actions', async () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set([1])}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(
        screen.getByText('This action cannot be undone')
      ).toBeInTheDocument();
    });
  });

  it('shows cancel button', () => {
    render(
      <BatchOperationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        tasks={mockTasks}
        selectedIds={new Set()}
        onComplete={mockOnComplete}
        lists={mockLists}
        labels={mockLabels}
      />
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
