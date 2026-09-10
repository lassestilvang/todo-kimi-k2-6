import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SkeletonLoader,
  TaskListItemSkeleton,
  TaskCardSkeleton,
  KanbanColumnSkeleton,
} from '../skeleton-loader';

describe('SkeletonLoader', () => {
  it('should render default text variant', () => {
    render(<SkeletonLoader />);
    const skeleton = screen.getByTestId('skeleton-text');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<SkeletonLoader className="custom-class" />);
    const skeleton = screen.getByTestId('skeleton-text');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('should render avatar variant', () => {
    render(<SkeletonLoader variant="avatar" />);
    const skeleton = screen.getByTestId('skeleton-avatar');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('h-10', 'w-10', 'rounded-full');
  });

  it('should render compact variant', () => {
    render(<SkeletonLoader variant="compact" />);
    const skeleton = screen.getByTestId('skeleton-compact');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render list variant with correct structure', () => {
    const { container: listContainer } = render(<SkeletonLoader variant="list" />);
    const containerDiv = listContainer.querySelector('.flex.items-center');
    expect(containerDiv).toBeInTheDocument();
  });

  it('should render card variant with correct structure', () => {
    const { container: cardContainer } = render(<SkeletonLoader variant="card" />);
    const containerDiv = cardContainer.querySelector('.space-y-2');
    expect(containerDiv).toBeInTheDocument();
  });

  it('should render multiple items when count > 1', () => {
    render(<SkeletonLoader count={3} variant="text" />);
    const skeletons = screen.getAllByTestId('skeleton-text');
    expect(skeletons).toHaveLength(3);
  });
});

describe('TaskListItemSkeleton', () => {
  it('should render 5 task items by default', () => {
    const { container: listContainer } = render(<TaskListItemSkeleton />);
    const items = listContainer.querySelectorAll('.flex.items-start.gap-3');
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  it('should render specified number of items', () => {
    const { container: listContainer } = render(<TaskListItemSkeleton count={3} />);
    const items = listContainer.querySelectorAll('.flex.items-start.gap-3');
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it('should have proper structure for task items', () => {
    const { container: listContainer } = render(<TaskListItemSkeleton count={1} />);
    const borderItem = listContainer.querySelector('.border');
    expect(borderItem).toBeInTheDocument();
  });
});

describe('TaskCardSkeleton', () => {
  it('should render 3 cards by default', () => {
    const { container: cardContainer } = render(<TaskCardSkeleton />);
    const cards = cardContainer.querySelectorAll('.border.rounded-lg.p-4');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it('should render specified number of cards', () => {
    const { container: cardContainer } = render(<TaskCardSkeleton count={2} />);
    const cards = cardContainer.querySelectorAll('.border.rounded-lg.p-4');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it('should have animated-pulse class for visual indication', () => {
    const { container: cardContainer } = render(<TaskCardSkeleton count={1} />);
    const card = cardContainer.querySelector('.animate-pulse');
    expect(card).toBeInTheDocument();
  });
});

describe('KanbanColumnSkeleton', () => {
  it('should render 4 columns by default', () => {
    const { container: kanbanContainer } = render(<KanbanColumnSkeleton />);
    const columns = kanbanContainer.querySelectorAll('.flex-1.min-w-\\[200px\\]');
    expect(columns.length).toBeGreaterThanOrEqual(4);
  });

  it('should render specified number of columns', () => {
    const { container: kanbanContainer } = render(<KanbanColumnSkeleton columns={2} />);
    const columns = kanbanContainer.querySelectorAll('.flex-1.min-w-\\[200px\\]');
    expect(columns.length).toBeGreaterThanOrEqual(2);
  });

  it('should have horizontal overflow for scrolling', () => {
    const { container: kanbanContainer } = render(<KanbanColumnSkeleton />);
    const mainContainer = kanbanContainer.querySelector('.flex.gap-4.overflow-x-auto');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should render column content', () => {
    const { container: kanbanContainer } = render(<KanbanColumnSkeleton columns={1} />);
    const columnTitle = kanbanContainer.querySelector('.h-6.w-3\\/4');
    expect(columnTitle).toBeInTheDocument();
  });
});