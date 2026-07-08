// Re-export all actions from modular files
// This file provides a single entry point for all server actions

// Auth
export { getCurrentUser, getUserByEmail, createUser } from "./auth";

// Permissions
export { isOwner, isEditor, isViewer, canPerformActionByPermission } from "./permissions";

// Lists
export { getLists, getListById, createList, updateList, deleteList } from "./lists";

// Labels
export { getLabels, getLabelById, createLabel, deleteLabel } from "./labels";

// Tasks (main task operations)
export {
  getTaskById,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getOverdueCount,
  getTasksByIds,
  generateRecurringTasks,
  toggleSubtask,
  bulkUpdateTasks,
  bulkDeleteTasks,
  saveTemplateFromTask,
} from "./tasks";

// Task dependencies
export {
  addTaskDependency,
  removeTaskDependency,
  getBlockedTasks,
} from "./dependencies";

// Templates
export {
  getTemplates,
  createTemplate,
  deleteTemplate,
  saveTemplateFromTask,
} from "./templates";

// Template categories
export {
  getTemplateCategories,
  getTemplateCategoryById,
  createTemplateCategory,
  deleteTemplateCategory,
  getTemplatesByCategory,
} from "./template-categories";

// Task comments
export { addTaskComment, getTaskComments } from "./comments";

// Import/Export
export { exportData, exportCsv, exportJson, exportIcal, exportPdf, importData } from "./export";

// Time tracking
export { getTimeReport, getWeeklyTimeSummary } from "./time-tracking";

// Task attachments
export { getTaskAttachments, addTaskAttachment, deleteTaskAttachment } from "./attachments";

// Calendar sync
export { getCalendarSync, saveCalendarSync, deleteCalendarSync } from "./calendar";

// Task assignment
export {
  getTaskAssignments,
  assignTask,
  unassignTask,
  getTasksAssignedToUser,
  getPendingAssignments,
} from "./assignments";

// Custom views
export {
  getCustomViews,
  getCustomViewById,
  createCustomView,
  updateCustomView,
  deleteCustomView,
} from "./views";

// Reminders
export {
  getReminders,
  getUpcomingReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  deleteRemindersForTask,
  getDueReminders,
  snoozeReminder,
} from "./reminders";

// Analytics
export { getTaskAnalytics, getGoalAnalytics } from "./analytics";

// Goals
export {
  getGoals,
  getGoalById,
  createGoal,
  updateGoalProgress,
  resetGoal,
  getGoalMilestones,
  createGoalMilestone,
  updateMilestoneProgress,
  completeGoalMilestone,
  skipGoalMilestone,
  getGoalProgress,
} from "./goals";

// Habits
export {
  getHabitStreak,
  getHabitCompletions,
  toggleHabitCompletion,
  resetHabitStreak,
  getStreakLeaderboard,
} from "./habits";

// Users
export { getUsers, searchUsers } from "./users";

// Workspaces
export {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  getWorkspaceMembers,
  canUserAccessWorkspace,
  getUserWorkspaceRole,
  updateUserWorkspaceRole,
  getWorkspacePermissions,
} from "./workspaces";

// Filter presets
export { getFilterPresets, createFilterPreset, deleteFilterPreset } from "./filter-presets";

// Sharing
export {
  shareTask,
  createPublicShare,
  getTaskShares,
  getSharedTasks,
  getShareByToken,
  removeShare,
  getOrCreateUser,
} from "./sharing";

// Sharing actions
export { shareTaskWithUser, getUsers as getSharedUsers, canAccessTask, getSharedTasksForUser } from "./sharing-actions";

// Task helpers (no-op in browser)
export { logTaskAction } from "./task-helpers";