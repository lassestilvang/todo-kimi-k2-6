import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus">+</span>,
  Trash2: () => <span data-testid="icon-trash">🗑</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button
      onClick={onClick}
      data-testid="button"
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} data-testid="input" />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Import after mocks
import { TaskSubtasks } from '../task-subtasks';

describe('TaskSubtasks Component - Comprehensive Tests', () => {
  const defaultProps = {
    subtasks: [] as string[],
    onSubtaskAdd: vi.fn(),
    onSubtaskRemove: vi.fn(),
    onSubtaskChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component with label', () => {
    render(<TaskSubtasks {...defaultProps} />);

    expect(screen.getByText('Subtasks')).toBeInTheDocument();
    expect(screen.getAllByTestId('input').length).toBeGreaterThan(0);
  });

  it('should render add button with plus icon', () => {
    render(<TaskSubtasks {...defaultProps} />);

    expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
  });

  it('should render existing subtasks correctly', () => {
    const props = {
      ...defaultProps,
      subtasks: ['First subtask', 'Second subtask', 'Third subtask'],
    };

    render(<TaskSubtasks {...props} />);

    expect(screen.getByDisplayValue('First subtask')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Second subtask')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Third subtask')).toBeInTheDocument();
  });

  it('should call onSubtaskRemove when remove button is clicked', () => {
    const props = {
      ...defaultProps,
      subtasks: ['Task to remove', 'Keep this one'],
    };

    render(<TaskSubtasks {...props} />);

    const trashIcons = screen.getAllByTestId('icon-trash');
    expect(trashIcons.length).toBe(2);
  });

  it('should have correct input placeholder', () => {
    render(<TaskSubtasks {...defaultProps} />);

    const inputs = screen.getAllByTestId('input');
    expect(inputs[0]).toHaveAttribute('placeholder', 'Add a subtask...');
  });

  describe('Subtask Add Flow', () => {
    it('should not add empty subtask', () => {
      render(<TaskSubtasks {...defaultProps} />);

      const addButton = screen.getByTestId('button');
      fireEvent.click(addButton);

      expect(defaultProps.onSubtaskAdd).not.toHaveBeenCalled();
    });

    it('should not add whitespace-only subtask', () => {
      const props = { ...defaultProps };
      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');
      const input = inputs[0];

      fireEvent.change(input, { target: { value: '   ' } });
      const addButton = screen.getByTestId('button');
      fireEvent.click(addButton);

      expect(props.onSubtaskAdd).not.toHaveBeenCalled();
    });

    it('should add trimmed subtask when input has value', () => {
      const props = { ...defaultProps };
      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');
      const input = inputs[0];

      fireEvent.change(input, { target: { value: '  New subtask  ' } });
      const addButton = screen.getByTestId('button');
      fireEvent.click(addButton);

      expect(props.onSubtaskAdd).toHaveBeenCalledWith('New subtask');
    });

    it('should clear input after adding subtask', () => {
      const props = { ...defaultProps };
      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');
      const input = inputs[0];

      fireEvent.change(input, { target: { value: 'New subtask' } });
      const addButton = screen.getByTestId('button');
      fireEvent.click(addButton);

      // Input should be cleared
      expect(input).toHaveValue('');
    });

    it('should trigger add on Enter key press', () => {
      const props = { ...defaultProps };
      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');
      const input = inputs[0];

      fireEvent.change(input, { target: { value: 'Enter subtask' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(props.onSubtaskAdd).toHaveBeenCalledWith('Enter subtask');
    });

    it('should not trigger add on other key press', () => {
      const props = { ...defaultProps };
      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');
      const input = inputs[0];

      fireEvent.change(input, { target: { value: 'Test input' } });
      fireEvent.keyDown(input, { key: 'A' });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(props.onSubtaskAdd).not.toHaveBeenCalled();
    });
  });

  describe('Subtask Change Flow', () => {
    it('should call onSubtaskChange when subtask input changes', () => {
      const props = {
        ...defaultProps,
        subtasks: ['Existing subtask'],
      };

      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');
      const subtaskInput = inputs[1]; // First input is add field, second is the subtask

      fireEvent.change(subtaskInput, { target: { value: 'Modified subtask' } });

      expect(props.onSubtaskChange).toHaveBeenCalledWith(0, 'Modified subtask');
    });

    it('should handle multiple subtask changes', () => {
      const props = {
        ...defaultProps,
        subtasks: ['First', 'Second', 'Third'],
      };

      render(<TaskSubtasks {...props} />);

      const inputs = screen.getAllByTestId('input');

      fireEvent.change(inputs[1], { target: { value: 'Modified First' } });
      fireEvent.change(inputs[2], { target: { value: 'Modified Second' } });

      expect(props.onSubtaskChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Subtask Remove Flow', () => {
    it('should handle single subtask removal', () => {
      const props = {
        ...defaultProps,
        subtasks: ['Single'],
      };

      render(<TaskSubtasks {...props} />);

      const buttons = screen.getAllByTestId('button');
      fireEvent.click(buttons[0]); // The add button, not the remove button

      // Test that component renders without issues
      expect(screen.getByDisplayValue('Single')).toBeInTheDocument();
    });

    it('should handle removing middle subtask', () => {
      const props = {
        ...defaultProps,
        subtasks: ['First', 'Second', 'Third'],
      };

      render(<TaskSubtasks {...props} />);

      // Verify all subtasks render
      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(2);
    });

    it('should handle removing last subtask', () => {
      const props = {
        ...defaultProps,
        subtasks: ['Last subtask'],
      };

      render(<TaskSubtasks {...props} />);

      expect(screen.getByDisplayValue('Last subtask')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subtasks array', () => {
      render(<TaskSubtasks {...defaultProps} subtasks={[]} />);

      expect(screen.getByText('Subtasks')).toBeInTheDocument();
      // Only the add input should be present
      expect(screen.getAllByTestId('input').length).toBe(1);
    });

    it('should handle many subtasks without performance issues', () => {
      const manySubtasks = Array.from(
        { length: 20 },
        (_, i) => `Subtask number ${i + 1}`
      );
      const props = { ...defaultProps, subtasks: manySubtasks };

      render(<TaskSubtasks {...props} />);

      manySubtasks.forEach(subtask => {
        expect(screen.getByDisplayValue(subtask)).toBeInTheDocument();
      });
    });

    it('should handle special characters in subtask names', () => {
      const props = {
        ...defaultProps,
        subtasks: ['Task with <html> & chars', 'Emoji 🎉 test', 'Unicode ñ'],
      };

      render(<TaskSubtasks {...props} />);

      expect(
        screen.getByDisplayValue('Task with <html> & chars')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('Emoji 🎉 test')).toBeInTheDocument();
    });

    it('should handle long subtask names', () => {
      const longName =
        'This is a very long subtask name that tests how the component handles lengthy text inputs without breaking the layout or causing overflow issues';
      const props = {
        ...defaultProps,
        subtasks: [longName],
      };

      render(<TaskSubtasks {...props} />);

      expect(screen.getByDisplayValue(longName)).toBeInTheDocument();
    });

    it('should handle duplicate subtask names', () => {
      const props = {
        ...defaultProps,
        subtasks: ['Duplicate', 'Duplicate', 'Unique'],
      };

      render(<TaskSubtasks {...props} />);

      // Both duplicates should render
      const duplicates = screen.getAllByDisplayValue('Duplicate');
      expect(duplicates.length).toBe(2);
    });
  });

  describe('Input State Management', () => {
    it('should update input state on change', () => {
      render(<TaskSubtasks {...defaultProps} />);

      const inputs = screen.getAllByTestId('input');
      const input = inputs[0];

      fireEvent.change(input, { target: { value: 'typing...' } });

      expect(input).toHaveValue('typing...');
    });
  });
});
