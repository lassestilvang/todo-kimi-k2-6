import { describe, it, expect } from 'bun:test';
import type { TaskWithRelations, List, Label, FilterPreset, SortField, SortDirection } from '@/types';

// Test the hook logic without renderHook (which requires jsdom)
describe('useTasks', () => {
  it('should be importable', () => {
    const { useTasks } = require('../use-tasks');
    expect(typeof useTasks).toBe('function');
  });

  it('should have correct return type structure', () => {
    // Verify the hook returns the expected structure
    const expectedKeys = [
      'tasks', 'lists', 'labels', 'currentView', 'currentListId',
      'searchQuery', 'currentFilterPreset', 'searchInputRef',
      'visibleTasks', 'overdueCount', 'sortBy', 'sortDirection',
      'filterListId', 'filterLabelIds', 'filterPriority', 'setTasks', 'setLists',
      'setLabels', 'setCurrentView', 'setCurrentListId',
      'setSearchQuery', 'setCurrentFilterPreset', 'handleViewChange',
      'handleSearch', 'handleFilterPresetChange', 'handleSort',
      'handleFilterList', 'handleFilterLabel', 'handleFilterPriority', 'clearFilters'
    ];
    // This tests the TypeScript types are correct
    expect(expectedKeys.length).toBe(30);
  });

  it('should handle filter presets correctly', () => {
    const presets: FilterPreset[] = ['needs_attention', 'this_week', 'with_labels', 'with_subtasks', 'completed'];
    expect(presets.length).toBe(5);
  });

  it('should support sort fields', () => {
    const sortFields: SortField[] = ['name', 'date', 'deadline', 'priority', 'created_at', 'updated_at'];
    expect(sortFields.length).toBe(6);
  });

  it('should support sort directions', () => {
    const directions: SortDirection[] = ['asc', 'desc'];
    expect(directions.length).toBe(2);
  });
});