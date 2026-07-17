#!/usr/bin/env node

const { execSync } = require('child_process');

const targetDate = "Fri Jul 17 2026 23:23:00 +0200";

const fileMessages = {
  "e2e/collaboration.spec.ts": "test(e2e): add end-to-end tests for task collaboration features",
  "e2e/gantt-chart.spec.ts": "test(e2e): add end-to-end tests for gantt chart visualization",
  "e2e/import-export.spec.ts": "test(e2e): add end-to-end tests for data import and export",
  "e2e/pomodoro-timer.spec.ts": "test(e2e): add end-to-end tests for pomodoro timer workflow",
  "e2e/task-modal.spec.ts": "test(e2e): add end-to-end tests for task modal dialog interaction",
  "src/app/api/__tests__/integration-api.test.ts": "test(api): add integration tests for main API endpoints",
  "src/app/api/attachments/__tests__/route.test.ts": "test(api): add route handler tests for attachment management",
  "src/app/api/auth/[...nextauth]/__tests__/config-auth-integration.test.ts": "test(auth): add integration tests for NextAuth configuration",
  "src/app/api/auth/[...nextauth]/__tests__/config-auth.test.ts": "test(auth): add unit tests for NextAuth configuration",
  "src/app/api/proactive-suggestions/route.ts": "feat(api): add route handler for AI proactive suggestions",
  "src/app/not-found.tsx": "feat(ui): add custom 404 not found page component",
  "src/components/session-provider.tsx": "feat(ui): add session provider wrapper component for NextAuth",
  "src/components/task/__tests__/task-calendar.test.tsx": "test(components): add unit tests for task calendar component",
  "src/components/task/__tests__/task-investment-portfolio.test.tsx": "test(components): add unit tests for task investment portfolio component",
  "src/components/task/__tests__/task-snippets.test.tsx": "test(components): add unit tests for task snippets component",
  "src/components/task/__tests__/time-tracker-full.test.tsx": "test(components): add comprehensive tests for time tracker component",
  "src/components/task/__tests__/time-tracking-complete.test.tsx": "test(components): add integration tests for complete time tracking UI",
  "src/components/task/__tests__/time-tracking-comprehensive.test.tsx": "test(components): add edge-case tests for time tracking UI",
  "src/components/task/achievements-wall.tsx": "feat(components): add achievements wall component for gamification",
  "src/components/task/insights-panel.tsx": "feat(components): add insights panel component for productivity metrics",
  "src/components/task/knowledge-graph.tsx": "feat(components): add interactive knowledge graph visualization component",
  "src/components/task/modal/__tests__/task-collaborate-tab.test.tsx": "test(components): add unit tests for task collaborate tab modal",
  "src/components/task/modal/__tests__/task-schedule.test.tsx": "test(components): add unit tests for task schedule modal component",
  "src/components/task/modal/__tests__/task-streak-tab.test.tsx": "test(components): add unit tests for task streak tab modal",
  "src/components/task/modal/__tests__/task-template-tab.test.tsx": "test(components): add unit tests for task template tab modal",
  "src/components/task/quick-capture.tsx": "feat(components): add quick capture task creation component",
  "src/components/task/skill-tracker.tsx": "feat(components): add skill tracker component for task skill progression",
  "src/components/task/task-investment-portfolio.tsx": "feat(components): add task investment portfolio visualization component",
  "src/components/task/task-snippets.tsx": "feat(components): add task code snippets snippet manager component",
  "src/components/task/task-snooze-dialog.tsx": "feat(components): add task snooze dialog component",
  "src/components/theme-scheduled-provider.tsx": "feat(components): add scheduled theme provider for time-based dark/light mode switching",
  "src/hooks/__tests__/use-task-mutations-comprehensive.test.ts": "test(hooks): add comprehensive test suite for useTaskMutations",
  "src/hooks/__tests__/use-task-mutations-full.test.ts": "test(hooks): add full coverage tests for task mutation hooks",
  "src/hooks/__tests__/use-tasks-edge-cases.test.ts": "test(hooks): add edge cases test suite for useTasks hook",
  "src/hooks/__tests__/use-tasks-full.test.ts": "test(hooks): add complete test coverage for useTasks hook",
  "src/hooks/use-ai-conversation-memory.ts": "feat(hooks): add custom hook for AI conversation history and context memory",
  "src/hooks/use-proactive-suggestions.ts": "feat(hooks): add custom hook for fetching and managing proactive AI suggestions",
  "src/lib/__tests__/api-middleware-full.test.ts": "test(lib): add full test coverage for API middleware functions",
  "src/lib/__tests__/cache-redis.test.ts": "test(lib): add unit and integration tests for Redis caching",
  "src/lib/__tests__/cache-uncovered.test.ts": "test(lib): add tests covering edge cases in cache library",
  "src/lib/__tests__/task-helpers-full.test.ts": "test(lib): add full test coverage for task helper utility functions",
  "src/lib/actions/__tests__/decisions.test.ts": "test(actions): add unit tests for decision matrix server actions",
  "src/lib/actions/__tests__/integrations.test.ts": "test(actions): add unit tests for third-party integration server actions",
  "src/lib/actions/__tests__/knowledge-graph.test.ts": "test(actions): add unit tests for knowledge graph server actions",
  "src/lib/actions/__tests__/scheduling.test.ts": "test(actions): add unit tests for automated scheduling server actions",
  "src/lib/actions/__tests__/task-helpers-comprehensive.test.ts": "test(actions): add comprehensive test coverage for action helpers",
  "src/lib/actions/__tests__/tasks-ai-edit.test.ts": "test(actions): add unit tests for AI-powered task editing server actions",
  "src/lib/actions/decisions.ts": "feat(actions): add server actions for decision matrix management",
  "src/lib/actions/integrations.ts": "feat(actions): add server actions for third-party service integrations",
  "src/lib/actions/knowledge-graph.ts": "feat(actions): add server actions for knowledge graph data management",
  "src/lib/actions/scheduling.ts": "feat(actions): add server actions for task scheduling logic",
  "src/lib/ai/__tests__/index-uncovered.test.ts": "test(ai): add tests for uncovered branches in core AI module",
  "src/lib/ai/__tests__/providers-branch.test.ts": "test(ai): add branch coverage tests for LLM providers",
  "src/lib/ai/__tests__/providers-comprehensive.test.ts": "test(ai): add comprehensive test suite for AI model provider integrations",
  "src/lib/ai/circadian.ts": "feat(ai): add circadian rhythm calculation helper for task optimization",
  "src/lib/ai/cognitive-load.ts": "feat(ai): add cognitive load estimation utilities for tasks",
  "src/lib/ai/enhanced.ts": "feat(ai): add enhanced AI capabilities and prompt orchestrator",
  "src/lib/ai/proactive-suggestions.ts": "feat(ai): add proactive suggestion generator for user tasks",
  "src/lib/db/__tests__/relations.test.ts": "test(db): add unit tests for database schema relations and constraints",
  "src/lib/gamification.ts": "feat(lib): add gamification logic for XP, levels, and user achievements",
  "src/lib/middleware/__tests__/error-handler-uncovered.test.ts": "test(middleware): add tests for uncovered error handling logic",
  "src/lib/task-health.test.ts": "test(lib): add unit tests for task health indicator utilities",
  "src/lib/task-health.ts": "feat(lib): add task health scoring and evaluation helpers",
  "src/test/test-utils.ts": "test(utils): add helper utilities and mock data setup for testing"
};

const statusOutput = execSync('git status --porcelain -uall', { encoding: 'utf8' });
const lines = statusOutput.trim().split('\n').filter(Boolean);

for (const line of lines) {
  const filePath = line.substring(3).trim();
  const msg = fileMessages[filePath] || `chore: add ${filePath}`;
  console.log(`Committing: ${filePath}`);
  execSync(`git add "${filePath}"`);
  execSync(`git commit -m "${msg}"`, {
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: targetDate,
      GIT_COMMITTER_DATE: targetDate,
    }
  });
}
console.log('All files committed successfully.');
