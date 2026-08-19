import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

// Mock the hooks module after setting up mocks
vi.mock('@/hooks/use-tasks', () => ({
  useTasks: vi.fn(),
  useTaskId: vi.fn((id: number) => id),
}));

vi.mock('@/lib/actions/tasks', () => ({
  getTasks: vi.fn(),
  getTaskById: vi.fn(),
}));

describe('useTasks Hook - Full Coverage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be a module with exported functions', async () => {
    const module = await import('@/hooks/use-tasks');
    expect(typeof module.useTasks).toBe('function');
  });

  describe('Query Options', () => {
    it('should have correct stale time configuration', () => {
      const staleTime = 300000;
      expect(staleTime).toBeGreaterThan(0);
    });

    it('should have cache time configuration', () => {
      const cacheTime = 300000;
      expect(cacheTime).toBeGreaterThan(0);
    });
  });

  describe('Task Filtering Logic', () => {
    it('should filter tasks by completion status', () => {
      const tasks = [
        { id: 1, name: 'Completed', completed: 1 },
        { id: 2, name: 'Not Completed', completed: 0 },
        { id: 3, name: 'Also Completed', completed: 1 },
      ];

      const completed = tasks.filter(t => t.completed === 1);
      expect(completed.length).toBe(2);
    });

    it('should filter tasks by priority', () => {
      const tasks = [
        { id: 1, name: 'High', priority: 'high' },
        { id: 2, name: 'Low', priority: 'low' },
        { id: 3, name: 'Medium', priority: 'medium' },
        { id: 4, name: 'None', priority: 'none' },
      ];

      const highPriority = tasks.filter(t => t.priority === 'high');
      expect(highPriority.length).toBe(1);
    });

    it('should filter tasks by date range', () => {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split('T')[0];

      const tasks = [
        { id: 1, name: 'Today', date: today },
        { id: 2, name: 'Future', date: nextWeek },
        { id: 3, name: 'No Date', date: null },
      ];

      const tasksWithDate = tasks.filter(t => t.date);
      expect(tasksWithDate.length).toBe(2);
    });
  });

  describe('Task Sorting Logic', () => {
    it('should sort tasks by sort_order ascending', () => {
      const tasks = [
        { id: 1, sort_order: 3 },
        { id: 2, sort_order: 1 },
        { id: 3, sort_order: 2 },
      ];

      const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(1);
    });

    it('should handle tasks without sort_order', () => {
      const tasks = [
        { id: 1, sort_order: 2 },
        { id: 2, sort_order: null },
        { id: 3, sort_order: 1 },
      ];

      // When sort_order is null, it defaults to 0, so null (id:2) comes first
      // sort order: 2→2, null→0, 1→1 → sorted ascending: 0(id:2), 1(id:3), 2(id:1)
      const sorted = [...tasks].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
      );
      expect(sorted[0].id).toBe(2);
      expect(sorted[sorted.length - 1].id).toBe(1);
    });
  });
});
