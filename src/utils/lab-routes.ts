/**
 * Labs routes configuration
 * Maps view IDs to their route paths for navigation
 */
export const LABS_ROUTES: Record<string, string> = {
  'decision-journal': '/labs/decision-journal',
  'knowledge-graph': '/labs/knowledge-graph',
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