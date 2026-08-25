import { describe, it, expect } from 'vitest';
import { LABS_ROUTES, isLabsRoute, getLabsRoute, getNavigationTarget } from '../lab-routes';

describe('Lab Routes Utility', () => {
  describe('LABS_ROUTES', () => {
    it('should have all required labs routes defined', () => {
      expect(LABS_ROUTES).toHaveProperty('decision-journal');
      expect(LABS_ROUTES).toHaveProperty('knowledge-graph');
      expect(LABS_ROUTES).toHaveProperty('skills-dashboard');
      expect(LABS_ROUTES).toHaveProperty('learning-path');
    });

    it('should map views to correct lab routes', () => {
      expect(LABS_ROUTES['decision-journal']).toBe('/labs/decision-journal');
      expect(LABS_ROUTES['knowledge-graph']).toBe('/labs/knowledge-graph');
      expect(LABS_ROUTES['skills-dashboard']).toBe('/labs/skills-dashboard');
      expect(LABS_ROUTES['learning-path']).toBe('/labs/learning-path');
    });

    it('should be a non-empty object', () => {
      expect(Object.keys(LABS_ROUTES).length).toBeGreaterThan(0);
    });

    it('should have unique route values', () => {
      const routes = Object.values(LABS_ROUTES);
      const uniqueRoutes = new Set(routes);
      expect(uniqueRoutes.size).toBe(routes.length);
    });
  });

  describe('isLabsRoute', () => {
    it('should return true for labs routes', () => {
      expect(isLabsRoute('decision-journal')).toBe(true);
      expect(isLabsRoute('knowledge-graph')).toBe(true);
      expect(isLabsRoute('skills-dashboard')).toBe(true);
      expect(isLabsRoute('learning-path')).toBe(true);
    });

    it('should return false for non-labs routes', () => {
      expect(isLabsRoute('today')).toBe(false);
      expect(isLabsRoute('kanban')).toBe(false);
      expect(isLabsRoute('analytics')).toBe(false);
      expect(isLabsRoute('calendar')).toBe(false);
      expect(isLabsRoute('ai')).toBe(false);
    });
  });

  describe('getLabsRoute', () => {
    it('should return the route for valid labs views', () => {
      expect(getLabsRoute('skills-dashboard')).toBe('/labs/skills-dashboard');
      expect(getLabsRoute('knowledge-graph')).toBe('/labs/knowledge-graph');
    });

    it('should return undefined for non-labs views', () => {
      expect(getLabsRoute('today')).toBeUndefined();
      expect(getLabsRoute('kanban')).toBeUndefined();
      expect(getLabsRoute('nonexistent')).toBeUndefined();
    });
  });

  describe('getNavigationTarget', () => {
    it('should return route type for labs routes', () => {
      const result = getNavigationTarget('skills-dashboard');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/skills-dashboard');
      }
    });

    it('should return internal type for non-labs routes', () => {
      const result = getNavigationTarget('today');
      expect(result.type).toBe('internal');
      if (result.type === 'internal') {
        expect(result.view).toBe('today');
      }
    });

    it('should preserve listId for internal navigation', () => {
      const result = getNavigationTarget('list', 5);
      expect(result.type).toBe('internal');
      if (result.type === 'internal') {
        expect(result.view).toBe('list');
        expect(result.listId).toBe(5);
      }
    });

    it('should return undefined listId for internal navigation when not provided', () => {
      const result = getNavigationTarget('today');
      expect(result.type).toBe('internal');
      if (result.type === 'internal') {
        expect(result.listId).toBeUndefined();
      }
    });

    it('should handle all labs routes', () => {
      const labsViews = Object.keys(LABS_ROUTES);
      labsViews.forEach(view => {
        const result = getNavigationTarget(view);
        expect(result.type).toBe('route');
        if (result.type === 'route') {
          expect(result.route).toBe(LABS_ROUTES[view]);
        }
      });
    });
  });
});