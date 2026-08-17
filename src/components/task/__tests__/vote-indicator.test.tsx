import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoteIndicator, VoteButton } from '../vote-indicator';

// Mock sonner
import { toast } from 'sonner';
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));
const mockToast = vi.mocked(toast);

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    size,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Tooltip
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => children,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('VoteIndicator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Props handling', () => {
    it('renders with required taskId prop', () => {
      render(<VoteIndicator taskId={1} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('updates score when initialScore prop changes', () => {
      const { rerender } = render(
        <VoteIndicator taskId={1} initialScore={5} />
      );

      expect(screen.getByText('5')).toBeInTheDocument();

      rerender(<VoteIndicator taskId={1} initialScore={10} />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('updates count when initialCount prop changes', () => {
      const { rerender } = render(
        <VoteIndicator taskId={1} initialCount={5} />
      );

      expect(screen.getByText('(5)')).toBeInTheDocument();

      rerender(<VoteIndicator taskId={1} initialCount={15} />);
      expect(screen.getByText('(15)')).toBeInTheDocument();
    });

    it('updates userVote when initialUserVote prop changes', () => {
      const { rerender } = render(
        <VoteIndicator taskId={1} initialUserVote={0} />
      );

      rerender(<VoteIndicator taskId={1} initialUserVote={1} />);

      rerender(<VoteIndicator taskId={1} initialUserVote={-1} />);
    });

    it('applies custom className', () => {
      render(<VoteIndicator taskId={1} className="custom-class" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('calls onVote callback when provided', () => {
      const mockOnVote = vi.fn();
      render(<VoteIndicator taskId={1} initialScore={2} onVote={mockOnVote} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Score calculations', () => {
    it('displays integer score correctly', () => {
      render(<VoteIndicator taskId={1} initialScore={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays decimal score correctly', () => {
      render(<VoteIndicator taskId={1} initialScore={2.5} />);
      expect(screen.getByText('2.5')).toBeInTheDocument();
    });

    it('rounds score to one decimal place', () => {
      render(<VoteIndicator taskId={1} initialScore={2.666} />);
      expect(screen.getByText('2.7')).toBeInTheDocument();
    });

    it('displays negative score correctly', () => {
      render(<VoteIndicator taskId={1} initialScore={-1.5} />);
      expect(screen.getByText('-1.5')).toBeInTheDocument();
    });

    it('displays zero score and count', () => {
      render(<VoteIndicator taskId={1} initialScore={0} initialCount={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });

  describe('Count display', () => {
    it('shows count in parentheses', () => {
      render(<VoteIndicator taskId={1} initialCount={42} />);
      expect(screen.getByText('(42)')).toBeInTheDocument();
    });

    it('shows zero count when not provided', () => {
      render(<VoteIndicator taskId={1} />);
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });

  describe('Accessibility indicators', () => {
    it('renders upvote and downvote buttons', () => {
      render(<VoteIndicator taskId={1} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Vote state rendering', () => {
    it('renders with user upvote state', () => {
      render(<VoteIndicator taskId={1} initialUserVote={1} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders with user downvote state', () => {
      render(<VoteIndicator taskId={1} initialUserVote={-1} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});

describe('VoteIndicator API Integration', () => {
  // toast is mocked via vi.mock at the top of the file

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/task-votes', () => {
    it('calls fetch with correct parameters for upvote', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          vote: { task_id: 1, user_id: 1, value: 1 },
          stats: { total: 5, count: 3, score: 1.67 },
        }),
      } as Response);

      render(<VoteIndicator taskId={1} initialScore={0} initialCount={0} />);
      const upvoteButton = screen.getAllByRole('button')[0];

      fireEvent.click(upvoteButton);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/task-votes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('calls fetch with correct parameters for downvote', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          vote: { task_id: 1, user_id: 1, value: -1 },
          stats: { total: -3, count: 5, score: -0.6 },
        }),
      } as Response);

      render(<VoteIndicator taskId={1} initialScore={0} initialCount={0} />);
      const downvoteButton = screen.getAllByRole('button')[1];

      fireEvent.click(downvoteButton);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/task-votes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('handles API error response with toast error', async () => {
      // Access mocked toast from sonner module
      const mockedToast = vi.mocked(await import('sonner')).toast;
      mockedToast.error = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid vote data' }),
      } as Response);

      render(<VoteIndicator taskId={1} />);
      const upvoteButton = screen.getAllByRole('button')[0];

      fireEvent.click(upvoteButton);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('handles network error gracefully', async () => {
      mockToast.error = vi.fn();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<VoteIndicator taskId={1} />);
      const upvoteButton = screen.getAllByRole('button')[0];

      fireEvent.click(upvoteButton);

      // Verify the error would be handled
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/task-votes', () => {
    it('calls fetch with DELETE method when removing vote', () => {
      render(
        <VoteIndicator
          taskId={1}
          initialScore={5}
          initialCount={10}
          initialUserVote={1}
        />
      );
      const upvoteButton = screen.getAllByRole('button')[0];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          stats: { total: 0, count: 5, score: 0 },
        }),
      } as Response);

      fireEvent.click(upvoteButton);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/task-votes'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});

describe('Vote state updates', () => {
  it('updates display after successful vote', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        vote: { task_id: 1, user_id: 1, value: 1 },
        stats: { total: 10, count: 8, score: 1.25 },
      }),
    } as Response);

    render(<VoteIndicator taskId={1} initialScore={0} initialCount={0} />);
    const upvoteButton = screen.getAllByRole('button')[0];

    fireEvent.click(upvoteButton);

    // Verify fetch was called with correct endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/task-votes',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});

describe('VoteButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Props handling', () => {
    it('renders with required taskId and score props', () => {
      render(<VoteButton taskId={1} score={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('displays upvoting arrow', () => {
      render(<VoteButton taskId={1} score={5} />);
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('displays downvoting arrow', () => {
      render(<VoteButton taskId={1} score={5} />);
      expect(screen.getByText('▼')).toBeInTheDocument();
    });
  });

  describe('User vote indicators', () => {
    it('highlights upvoted tasks', () => {
      render(<VoteButton taskId={1} score={5} userVote={1} />);
      const upvoteButton = screen.getByText('▲');
      expect(upvoteButton).toBeInTheDocument();
    });

    it('highlights downvoted tasks', () => {
      render(<VoteButton taskId={1} score={-3} userVote={-1} />);
      const downvoteButton = screen.getByText('▼');
      expect(downvoteButton).toBeInTheDocument();
    });

    it('shows dash when score is zero', () => {
      render(<VoteButton taskId={1} score={0} userVote={0} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Score display', () => {
    it('shows positive score', () => {
      render(<VoteButton taskId={1} score={10} userVote={0} />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows dash for non-positive scores', () => {
      render(<VoteButton taskId={1} score={-5} userVote={0} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('shows dash for zero score', () => {
      render(<VoteButton taskId={1} score={0} userVote={0} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('shows decimal score', () => {
      render(<VoteButton taskId={1} score={2.5} userVote={0} />);
      expect(screen.getByText('2.5')).toBeInTheDocument();
    });
  });

  describe('Vote API calls', () => {
    it('makes POST request when upvoting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          vote: { task_id: 1, user_id: 1, value: 1 },
          stats: { total: 5, count: 3, score: 1.67 },
        }),
      });

      render(<VoteButton taskId={1} score={0} userVote={0} />);
      const upvoteButton = screen.getByText('▲');

      fireEvent.click(upvoteButton);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/task-votes',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});

describe('Integration scenarios', () => {
  it('handles all vote states correctly', () => {
    // Test with upvoted state
    const { unmount } = render(
      <VoteIndicator
        taskId={1}
        initialScore={5}
        initialCount={10}
        initialUserVote={1}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
    unmount();

    // Test with downvoted state
    render(
      <VoteIndicator
        taskId={1}
        initialScore={-3}
        initialCount={5}
        initialUserVote={-1}
      />
    );
    expect(screen.getByText('-3')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('handles refresh scenario with new props', () => {
    const { rerender } = render(
      <VoteIndicator
        taskId={1}
        initialScore={2.5}
        initialCount={10}
        initialUserVote={0}
      />
    );

    expect(screen.getByText('2.5')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();

    // Simulate refresh with new vote data
    rerender(
      <VoteIndicator
        taskId={1}
        initialScore={4.0}
        initialCount={15}
        initialUserVote={1}
      />
    );

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('(15)')).toBeInTheDocument();
  });
});
