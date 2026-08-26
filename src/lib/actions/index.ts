// Re-export all actions from modular files
// This file provides a single entry point for all server actions

// Auth
export { getCurrentUser, getUserByEmail, createUser } from './auth';

// Permissions
export {
  isOwner,
  isEditor,
  isViewer,
  canPerformActionByPermission,
} from './permissions';

// Lists
export {
  getLists,
  getListById,
  createList,
  updateList,
  deleteList,
} from './lists';

// Labels
export { getLabels, getLabelById, createLabel, deleteLabel } from './labels';

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
  editTaskWithAI,
} from './tasks';

// Task dependencies
export {
  addTaskDependency,
  removeTaskDependency,
  getBlockedTasks,
} from './dependencies';

// Templates
export {
  getTemplates,
  createTemplate,
  deleteTemplate,
  saveTemplateFromTask,
} from './templates';

// Template categories
export {
  getTemplateCategories,
  getTemplateCategoryById,
  createTemplateCategory,
  deleteTemplateCategory,
  getTemplatesByCategory,
} from './template-categories';

// Task comments
export { addTaskComment, getTaskComments } from './comments';

// Import/Export
export {
  exportData,
  exportCsv,
  exportJson,
  exportIcal,
  exportPdf,
  importData,
  checkImportConflicts,
  type ImportOptions,
  type ImportResult,
  type ExportDataSchema,
  type ConflictCheckResult,
} from './export';

// Time tracking
export { getTimeReport, getWeeklyTimeSummary } from './time-tracking';

// Task attachments
export {
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
} from './attachments';

// Calendar sync
export {
  getCalendarSync,
  saveCalendarSync,
  deleteCalendarSync,
} from './calendar';

// Task assignment
export {
  getTaskAssignments,
  assignTask,
  unassignTask,
  getTasksAssignedToUser,
  getPendingAssignments,
} from './assignments';

// Custom views
export {
  getCustomViews,
  getCustomViewById,
  createCustomView,
  updateCustomView,
  deleteCustomView,
} from './views';

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
} from './reminders';

// Analytics
export { getTaskAnalytics, getGoalAnalytics } from './analytics';

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
} from './goals';

// Habits
export {
  getHabitStreak,
  getHabitCompletions,
  toggleHabitCompletion,
  resetHabitStreak,
  getStreakLeaderboard,
} from './habits';

// Users
export { getUsers, searchUsers } from './users';

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
} from './workspaces';

// Filter presets
export {
  getFilterPresets,
  createFilterPreset,
  deleteFilterPreset,
} from './filter-presets';

// Sharing
export {
  shareTask,
  createPublicShare,
  getTaskShares,
  getSharedTasks,
  getShareByToken,
  removeShare,
  getOrCreateUser,
} from './sharing';

// Sharing actions
export {
  shareTaskWithUser,
  getUsers as getSharedUsers,
  canAccessTask,
  getSharedTasksForUser,
} from './sharing-actions';

// Task helpers (no-op in browser)
export { logTaskAction } from './task-helpers';

// ----- 2026-09-15 expansion: productivity intelligence layer -----

// Operating principles
export {
  listPrinciples,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  inferPrinciples,
  type OperatingPrinciple,
} from './principles';

// Parking lot
export {
  parkTask,
  unparkTask,
  listParkedTasks,
  getResurrectionCandidates,
  resurrectTask,
  type ParkedTask,
} from './parking-lot';

// Async waits
export {
  createAsyncWait,
  listAsyncWaits,
  nudgeAsyncWait,
  resolveAsyncWait,
  getWaitsNeedingNudge,
  type AsyncWait,
} from './async-waits';

// Reflections (currentWeek lives in @/lib/week-utils because Server Actions can't export sync helpers)
export {
  saveReflection,
  getReflection,
  listReflections,
  type Reflection,
} from './reflections';

// Cognitive load
export {
  setCognitiveLoad,
  getWeeklyCognitiveLoad,
  suggestReorderedToday,
  type CognitiveLoad,
  type CognitiveLoadDistribution,
} from './cognitive-load';

// Context switches
export {
  recordContextSwitch,
  getContextSwitchStats,
  clearTodaySwitches,
  type ContextSwitch,
  type ContextSwitchStats,
} from './context-switches';

// Anti-procrastination
export {
  detectProcrastination,
  bumpReschedule,
  type ProcrastinationSignal,
} from './anti-procrastination';

// Briefings
export { getBriefing, type Briefing } from './briefings';

// Anti-goals
export {
  listAntiGoals,
  createAntiGoal,
  toggleAntiGoal,
  deleteAntiGoal,
  type AntiGoal,
} from './anti-goals';

// Reading queue
export {
  addToReadingQueue,
  listReadingQueue,
  setReadingStatus,
  setReadingSummary,
  deleteReadingItem,
  type ReadingItem,
} from './reading-queue';

// Webhooks
export {
  listWebhooks,
  createWebhook,
  toggleWebhook,
  deleteWebhook,
  findActiveWebhookBySlug,
  recordWebhookCall,
  type Webhook,
} from './webhooks';

// Habit bridges
export {
  bridgeHabitToTask,
  listHabitBridges,
  unbridgeHabitToTask,
  type HabitBridge,
} from './habit-bridge';

// Decision autopilot
export {
  listAutopilotDecisions,
  logAutopilotDecision,
  markDecisionOverridden,
  listGuardrails,
  setGuardrail,
  deleteGuardrail,
  autopilotDecide,
  type AutopilotDecision,
  type AutopilotGuardrail,
} from './autopilot';

// Task afterlife (archive)
export {
  softDeleteTask,
  listAfterlife,
  findAfterlifePatterns,
  type AfterlifeEntry,
  type AfterlifePattern,
} from './afterlife';

// Travel time
export {
  estimateTravelTime,
  recordTravelSegment,
  listTravelSegments,
  type TravelSegment,
} from './travel-time';

// Briefing preferences
export {
  getBriefingPreferences,
  saveBriefingPreferences,
  type BriefingPreferences,
} from './briefing-prefs';
