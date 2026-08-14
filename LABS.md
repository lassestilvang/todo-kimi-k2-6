# TaskFlow Labs - Developer Guide

This document provides detailed information about the new Labs features implemented in TaskFlow.

## Overview

TaskFlow Labs is an experimental playground for AI-powered productivity features. Each lab is designed to be independently usable and testable.

## Components

### 1. Decision Template Builder (`src/components/task/decision-template-builder.tsx`)

**Purpose:** Create and manage AI-generated decision templates for structured decision-making.

**Key Features:**

- Save AI-generated templates for reuse
- Search and organize by decision type
- Apply templates to tasks with placeholder substitution
- Track decision outcomes

**API Endpoint:** `POST /api/decision-templates`

**Decision Types:**

- Priority Decision - For determining task priority
- Approach Decision - For choosing implementation strategies
- Tool Selection - For selecting tools for tasks
- Timeline Decision - For scheduling decisions
- Resource Allocation - For human/resource assignment
- Cancellation Decision - For evaluating removing options

### 2. Project Planning Dashboard (`src/components/task/project-planning-dashboard.tsx`)

**Purpose:** Generate and manage project plans using AI.

**Key Features:**

- AI generates project phases from natural language
- Gantt-style timeline visualization
- Progress tracking per phase
- Export to task lists

**AI Endpoint:** `POST /api/ai` with `type: generateProjectPlan`

### 3. Skills Growth Tracker (`src/components/task/skills-growth-tracker.tsx`)

**Purpose:** Automatically track skill development through completed tasks.

**Key Features:**

- Skill extraction from task keywords
- Proficiency levels (1-5 scale)
- Skill diversity metrics
- Personalized recommendations

### 4. TaskFlow Labs AI Playground (`src/components/task/taskflow-labs.tsx`)

**Purpose:** Compare AI model performance on task parsing.

**Key Features:**

- Side-by-side model comparison
- Response time metrics
- Success rate tracking
- Confidence scoring

**API Endpoint:** `POST /api/ai/parse-comparison`

### 5. Energy Scheduler (`src/components/task/energy-scheduler.tsx`)

**Purpose:** Optimize task scheduling based on energy patterns.

**Key Features:**

- Energy level logging by time of day
- Smart scheduling suggestions
- Flow protection indicators
- Task-to-energy matching

### 6. Task Success Stories (`src/components/task/task-success-stories.tsx`)

**Purpose:** Capture learnings from completed tasks.

**Key Features:**

- What went well reflection
- Key insights capture
- Improvement suggestions
- Personal learning journal
- Difficulty tagging

## Pages

| Route                    | Component                | Purpose             |
| ------------------------ | ------------------------ | ------------------- |
| `/labs`                  | LabsPage                 | Main dashboard      |
| `/labs/ai-parsing`       | TaskFlowLabs             | AI comparison       |
| `/labs/project-planning` | ProjectPlanningDashboard | Project planning    |
| `/labs/skills`           | SkillsGrowthTracker      | Skill tracking      |
| `/labs/energy`           | EnergyScheduler          | Energy optimization |
| `/labs/stories`          | TaskSuccessStories       | Learning journal    |

## Integration Patterns

All new components follow these patterns:

1. **Server Actions:** Use existing `src/lib/actions/` modules
2. **State Management:** Use React hooks (useState, useMemo)
3. **Styling:** Tailwind CSS + shadcn/ui components
4. **API Calls:** Fetch from existing API routes
5. **Storage:** localStorage for client-side persistence
6. **TypeScript:** Full type definitions with interfaces

## Testing

Components should be tested for:

- Rendering without props
- Interaction handling (buttons, forms)
- API response handling
- Empty states
- Error states

## Performance Considerations

- Use `useMemo` for expensive calculations
- Implement virtualization for long lists
- Debounce search inputs
- Cache API responses where appropriate

## Accessibility

All components should:

- Use semantic HTML
- Have proper ARIA labels
- Support keyboard navigation
- Have visible focus states
- Use sufficient color contrast
