/**
 * Labs routes configuration
 * Maps view IDs to their route paths for navigation
 *
 * View IDs use snake_case (as defined in page.tsx viewTitles),
 * while route paths use kebab-case for consistency with URL structure.
 */
export const LABS_ROUTES: Record<string, string> = {
  // Core labs routes (existing)
  'decision_journal': '/labs/decision-journal',
  'skills_dashboard': '/labs/skills-dashboard',
  'learning_path': '/labs/learning-path',
  'knowledge_graph': '/labs/knowledge-graph',
  // Additional labs routes (newly added)
  'career_compass': '/labs/career-compass',
  'energy_scheduler': '/labs/energy-scheduler',
  'enhanced_analytics': '/labs/enhanced-analytics',
  'integrations': '/labs/integrations',
  'project_planning': '/labs/project-planning',
  'meeting_assistant': '/labs/meeting-assistant',
  'stories': '/labs/stories',
};

/**
 * Legacy aliases for backwards compatibility (deprecated)
 */
export const LABS_LEGACY_ALIASES: Record<string, string> = {
  'decision-journal': '/labs/decision-journal',
  'skills-dashboard': '/labs/skills-dashboard',
  'learning-path': '/labs/learning-path',
};

/**
 * Checks if a view ID corresponds to a labs route
 */
export function isLabsRoute(view: string): boolean {
  return view in LABS_ROUTES;
}

/**
 * Gets the route path for a labs view, or undefined if not a labs route
 */
export function getLabsRoute(view: string): string | undefined {
  return LABS_ROUTES[view];
}

/**
 * Determines the navigation destination for a view change
 * @returns object with either 'route' for external navigation or 'view' for internal
 */
export function getNavigationTarget(view: string, listId?: number | undefined):
  | { type: 'route'; route: string }
  | { type: 'internal'; view: string; listId?: number | undefined } {
  const route = getLabsRoute(view);
  if (route) {
    return { type: 'route', route };
  }
  return { type: 'internal', view, listId };
}