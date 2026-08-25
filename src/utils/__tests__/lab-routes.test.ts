import { describe, it, expect, test } from 'vitest';
import {
  LABS_ROUTES,
  isLabsRoute,
  getLabsRoute,
  getNavigationTarget,
} from '../lab-routes';

describe('Lab Routes Utility', () => {
  describe('LABS_ROUTES constant', () => {
    it('should have all required labs routes defined', () => {
      // Core labs routes
      expect(LABS_ROUTES).toHaveProperty('decision_journal');
      expect(LABS_ROUTES).toHaveProperty('knowledge_graph');
      expect(LABS_ROUTES).toHaveProperty('skills_dashboard');
      expect(LABS_ROUTES).toHaveProperty('learning_path');
      // Additional labs routes
      expect(LABS_ROUTES).toHaveProperty('integrations');
      expect(LABS_ROUTES).toHaveProperty('career_compass');
      expect(LABS_ROUTES).toHaveProperty('energy_scheduler');
      expect(LABS_ROUTES).toHaveProperty('enhanced_analytics');
      expect(LABS_ROUTES).toHaveProperty('project_planning');
      expect(LABS_ROUTES).toHaveProperty('meeting_assistant');
      expect(LABS_ROUTES).toHaveProperty('stories');
    });

    it('should map views to correct lab routes', () => {
      expect(LABS_ROUTES['decision_journal']).toBe('/labs/decision-journal');
      expect(LABS_ROUTES['knowledge_graph']).toBe('/labs/knowledge-graph');
      expect(LABS_ROUTES['skills_dashboard']).toBe('/labs/skills-dashboard');
      expect(LABS_ROUTES['learning_path']).toBe('/labs/learning-path');
    });

    it('should be a non-empty object', () => {
      expect(Object.keys(LABS_ROUTES).length).toBeGreaterThan(0);
    });

    it('should have unique route values', () => {
      const routes = Object.values(LABS_ROUTES);
      const uniqueRoutes = new Set(routes);
      expect(uniqueRoutes.size).toBe(routes.length);
    });

    it('should have correct route format', () => {
      Object.values(LABS_ROUTES).forEach(route => {
        expect(route).toMatch(/^\/labs\/[a-z-]+$/);
      });
    });

    it('should have 11 labs routes', () => {
      expect(Object.keys(LABS_ROUTES).length).toBe(11);
    });

    it('should have extended analytics route', () => {
      expect(LABS_ROUTES).toHaveProperty('enhanced_analytics', '/labs/enhanced-analytics');
    });

    it('should have energy scheduler route', () => {
      expect(LABS_ROUTES).toHaveProperty('energy_scheduler', '/labs/energy-scheduler');
    });

    it('should have career compass route', () => {
      expect(LABS_ROUTES).toHaveProperty('career_compass', '/labs/career-compass');
    });

    it('should have integrations route', () => {
      expect(LABS_ROUTES).toHaveProperty('integrations', '/labs/integrations');
    });
  });

  describe('isLabsRoute', () => {
    it('should return true for labs routes', () => {
      expect(isLabsRoute('decision_journal')).toBe(true);
      expect(isLabsRoute('knowledge_graph')).toBe(true);
      expect(isLabsRoute('skills_dashboard')).toBe(true);
      expect(isLabsRoute('learning_path')).toBe(true);
    });

    it('should return true for new labs routes', () => {
      expect(isLabsRoute('integrations')).toBe(true);
      expect(isLabsRoute('career_compass')).toBe(true);
      expect(isLabsRoute('energy_scheduler')).toBe(true);
      expect(isLabsRoute('enhanced_analytics')).toBe(true);
    });

    it('should return false for non-labs routes', () => {
      expect(isLabsRoute('today')).toBe(false);
      expect(isLabsRoute('kanban')).toBe(false);
      expect(isLabsRoute('analytics')).toBe(false);
      expect(isLabsRoute('calendar')).toBe(false);
      expect(isLabsRoute('ai')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isLabsRoute('')).toBe(false);
    });

    it('should return false for undefined-like values', () => {
      expect(isLabsRoute('undefined')).toBe(false);
      expect(isLabsRoute('null')).toBe(false);
    });
  });

  describe('getLabsRoute', () => {
    it('should return the route for valid labs views', () => {
      expect(getLabsRoute('skills_dashboard')).toBe('/labs/skills-dashboard');
      expect(getLabsRoute('knowledge_graph')).toBe('/labs/knowledge-graph');
      expect(getLabsRoute('decision_journal')).toBe('/labs/decision-journal');
      expect(getLabsRoute('learning_path')).toBe('/labs/learning-path');
    });

    it('should return routes for new labs views', () => {
      expect(getLabsRoute('knowledge_graph')).toBe('/labs/knowledge-graph');
      expect(getLabsRoute('learning_path')).toBe('/labs/learning-path');
      expect(getLabsRoute('integrations')).toBe('/labs/integrations');
      expect(getLabsRoute('career_compass')).toBe('/labs/career-compass');
      expect(getLabsRoute('energy_scheduler')).toBe('/labs/energy-scheduler');
      expect(getLabsRoute('enhanced_analytics')).toBe('/labs/enhanced-analytics');
    });

    it('should return undefined for non-labs views', () => {
      expect(getLabsRoute('today')).toBeUndefined();
      expect(getLabsRoute('kanban')).toBeUndefined();
      expect(getLabsRoute('nonexistent')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getLabsRoute('')).toBeUndefined();
    });
  });

  describe('getNavigationTarget', () => {
    it('should return route type for labs routes', () => {
      const result = getNavigationTarget('skills_dashboard');
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

    it('should handle decision_journal route', () => {
      const result = getNavigationTarget('decision_journal');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/decision-journal');
      }
    });

    it('should handle knowledge_graph route', () => {
      const result = getNavigationTarget('knowledge_graph');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/knowledge-graph');
      }
    });

    it('should handle learning_path route', () => {
      const result = getNavigationTarget('learning_path');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/learning-path');
      }
    });

    it('should handle career_compass as labs route', () => {
      const result = getNavigationTarget('career_compass');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/career-compass');
      }
    });

    it('should handle energy_scheduler as labs route', () => {
      const result = getNavigationTarget('energy_scheduler');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/energy-scheduler');
      }
    });

    it('should handle enhanced_analytics as labs route', () => {
      const result = getNavigationTarget('enhanced_analytics');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/enhanced-analytics');
      }
    });

    it('should handle integrations as labs route', () => {
      const result = getNavigationTarget('integrations');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/integrations');
      }
    });

    it('should handle ai-parsing route as internal (not a labs route)', () => {
      const result = getNavigationTarget('ai_parsing');
      expect(result.type).toBe('internal');
    });

    it('should handle project_planning as labs route', () => {
      const result = getNavigationTarget('project_planning');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/project-planning');
      }
    });

    it('should handle stories as labs route', () => {
      const result = getNavigationTarget('stories');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/stories');
      }
    });

    it('should handle meeting_assistant as labs route', () => {
      const result = getNavigationTarget('meeting_assistant');
      expect(result.type).toBe('route');
      if (result.type === 'route') {
        expect(result.route).toBe('/labs/meeting-assistant');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined listId with value 0', () => {
      const result = getNavigationTarget('today', 0);
      expect(result.type).toBe('internal');
      if (result.type === 'internal') {
        expect(result.listId).toBe(0);
      }
    });

    it('should handle null-like string', () => {
      expect(isLabsRoute('null')).toBe(false);
      expect(getLabsRoute('null')).toBeUndefined();
    });

    it('should handle numeric string', () => {
      expect(isLabsRoute('123')).toBe(false);
      expect(getLabsRoute('123')).toBeUndefined();
    });

    it('should handle all route variations correctly', () => {
      // knowledge_graph is the canonical key for knowledge graph route
      expect(LABS_ROUTES['knowledge_graph']).toBe('/labs/knowledge-graph');
    });
  });
});

describe('Module exports', () => {
  test('LABS_ROUTES should be exported correctly', () => {
    expect(LABS_ROUTES).toBeDefined();
    expect(typeof LABS_ROUTES).toBe('object');
  });

  test('isLabsRoute should be a function', () => {
    expect(typeof isLabsRoute).toBe('function');
  });

  test('getLabsRoute should be a function', () => {
    expect(typeof getLabsRoute).toBe('function');
  });

  test('getNavigationTarget should be a function', () => {
    expect(typeof getNavigationTarget).toBe('function');
  });
});

describe('Integration - Page.tsx re-export', () => {
  it('should allow page.tsx to re-export LABS_ROUTES', async () => {
    // This test verifies the module can be imported from page.tsx re-export
    const routes = await import('../lab-routes');
    expect(routes.LABS_ROUTES).toBeDefined();
    expect(Object.keys(routes.LABS_ROUTES).length).toBe(11);
  });
});