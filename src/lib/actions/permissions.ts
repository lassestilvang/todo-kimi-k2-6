/**
 * Permission utilities for task and workspace access control
 * These functions can be used in both client and server contexts
 */

// Admin email for special permissions (would normally come from config)
const ADMIN_EMAIL = "admin@todo.com";

/**
 * Check if a user is the owner (admin)
 */
export function isOwner(email: string): boolean {
  if (!email) return false;

  // Admin has full owner access
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // In a real implementation, this would check if the user owns the resource
  // For now, only admin is considered owner
  return false;
}

/**
 * Check if a user has editor permissions
 */
export function isEditor(email: string): boolean {
  if (!email) return false;

  // Admin is also an editor
  if (isOwner(email)) return true;

  // Regular users have editor access
  // In a real system, this would check workspace membership or explicit permissions
  return email.includes("@");
}

/**
 * Check if a user has viewer permissions
 */
export function isViewer(email: string): boolean {
  if (!email) return false;

  // All authenticated users can view
  // This would check session validity in production
  return true;
}

/**
 * Check if user can perform an action based on permission level
 */
export function canPerformActionByPermission(
  userEmail: string | null,
  action: "view" | "edit" | "delete" | "admin" = "view"
): boolean {
  if (!userEmail) return action === "view"; // Allow viewing for guests

  switch (action) {
    case "view":
      return true; // All authenticated users can view
    case "edit":
      return isEditor(userEmail);
    case "delete":
      return isOwner(userEmail);
    case "admin":
      return isOwner(userEmail);
    default:
      return false;
  }
}