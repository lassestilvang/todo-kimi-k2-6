# TaskFlow Labs - Developer Guide

This document provides detailed information about the new Labs features implemented in TaskFlow.

## Overview

TaskFlow Labs is an experimental playground for AI-powered productivity features. Each lab is designed to be independently usable and testable.

## Labs Overview

| Route | Title | Purpose |
|-------|-------|---------|
| `/labs/ai-parsing` | AI Playground | Compare OpenAI, Claude, and keyword parser on task parsing |
| `/labs/project-planning` | Project Planner | Generate full project plans from natural language |
| `/labs/skills` | Skills Tracker | Track skill development through completed tasks |
| `/labs/energy` | Energy Scheduler | Optimize your schedule based on energy patterns |
| `/labs/stories` | Success Stories | Capture insights from completed tasks |
| `/labs/gamification` | Gamification | XP, levels, achievements, and leaderboards |
| `/labs/marketplace` | Task Marketplace | Trade tasks for XP with team members |
| `/labs/social-feed` | Social Feed | Team activity stream and recognition |
| `/labs/voice-control` | Voice Control | Voice commands for task management |
| `/labs/project-wiki` | Project Wiki | Collaborative project knowledge base |
| `/labs/meeting-assistant` | Meeting Assistant | AI-powered meeting notes and action items |
| `/labs/notification-digest` | Notification Digest | Daily/weekly summaries of activity |
| `/labs/risk-assessment` | Risk Assessment | Predictive risk analysis for projects |
| `/labs/career-compass-2` | Career Compass | Career path planning with skill mapping |
| `/labs/decision-journal` | Decision Journal | Structured decision-making framework |
| `/labs/knowledge-graph` | Knowledge Graph | Build semantic connections between tasks |
| `/labs/learning-path` | Learning Path | AI-generated skill development plans |
| `/labs/skills-dashboard` | Skills Dashboard | Dashboard for tracking skill progression |

## Core Labs

### 1. AI Playground (`/labs/ai-parsing`)
Compare different AI models and their task parsing capabilities.

**Features:**
- Side-by-side model comparison
- Response time metrics
- Success rate tracking
- Confidence scoring

### 2. Project Planner (`/labs/project-planning`)
Generate comprehensive project plans from natural language descriptions.

**Features:**
- AI generates phases from text
- Gantt-style timeline visualization
- Progress tracking per phase
- Export to task lists

### 3. Skills Tracker (`/labs/skills`)
Automatically track skill development through completed tasks.

**Features:**
- Skill extraction from task keywords
- Proficiency levels (1-5 scale)
- Skill diversity metrics
- Personalized recommendations

### 4. Energy Scheduler (`/labs/energy`)
Optimize task scheduling based on energy patterns.

**Features:**
- Energy level logging by time of day
- Smart scheduling suggestions
- Flow protection indicators
- Task-to-energy matching

### 5. Success Stories (`/labs/stories`)
Capture learnings and insights from completed tasks.

**Features:**
- Reflection prompts
- Key insights capture
- Improvement suggestions
- Personal learning journal
- Difficulty tagging

## New 2026 Features

### 6. Gamification (`/labs/gamification`)
Add XP, levels, and achievements to boost engagement.

**Features:**
- XP earned per completed task
- Level progression system
- Badge achievements
- Team leaderboard
- Rank tiers (Bronze, Silver, Gold, Platinum)

**API Endpoints:**
- `GET /api/gamification` - Get user's gamification data
- `POST /api/gamification/complete` - Mark task complete with XP
- `GET /api/gamification/leaderboard` - Get team leaderboard

### 7. Task Marketplace (`/labs/marketplace`)
Trade tasks with team members using XP as currency.

**Features:**
- List tasks for XP
- Claim tasks from others
- Built-in reputation system
- Category-based browsing
- Skill requirements

**API Endpoints:**
- `GET /api/marketplace` - List available tasks
- `POST /api/marketplace/listings` - Create listing
- `POST /api/marketplace/claim` - Claim a task

### 8. Social Feed (`/labs/social-feed`)
Team activity stream for recognition and collaboration.

**Features:**
- Real-time activity feed
- Likes and comments
- Auto-posts on milestones
- Mentions and notifications
- Daily auto-posts

### 9. Voice Control (`/labs/voice-control`)
Control task management with voice commands.

**Features:**
- Speech recognition
- NLP command parsing
- Execute actions via voice
- Voice history
- Multi-language support

**API Endpoints:**
- `POST /api/voice/process` - Process voice input
- `GET /api/voice/history` - Get command history

### 10. Project Wiki (`/labs/project-wiki`)
Collaborative knowledge base for projects.

**Features:**
- Markdown support
- Version history
- Comments on pages
- Search functionality
- Page linking

**API Endpoints:**
- `GET /api/wiki` - List wiki pages
- `POST /api/wiki` - Create page
- `GET /api/wiki/[id]` - Get page content

### 11. Meeting Assistant (`/labs/meeting-assistant`)
AI-powered meeting notes and action item extraction.

**Features:**
- Automatic note-taking
- Action item extraction
- Sentiment analysis
- Speaker attribution
- Meeting summaries

**API Endpoints:**
- `POST /api/meetings/notes` - Generate meeting notes
- `GET /api/meetings/[id]` - Get meeting data

### 12. Notification Digest (`/labs/notification-digest`)
Daily/weekly summaries of activity.

**Features:**
- Customizable digest frequency
- Priority filtering
- Smart grouping
- Unsubscribe handling

### 13. Risk Assessment (`/labs/risk-assessment`)
Predictive risk analysis for projects and tasks.

**Features:**
- Risk scoring algorithm
- Risk dashboard
- Risk alerts
- Mitigation suggestions
- Historical risk tracking

## Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/labs` | LabsPage | Main dashboard |
| `/labs/ai-parsing` | TaskFlowLabs | AI comparison |
| `/labs/project-planning` | ProjectPlanningDashboard | Project planning |
| `/labs/skills` | SkillsGrowthTracker | Skill tracking |
| `/labs/energy` | EnergyScheduler | Energy optimization |
| `/labs/stories` | TaskSuccessStories | Learning journal |
| `/labs/gamification` | GamificationPage | XP leaderboard |
| `/labs/marketplace` | MarketplacePage | Task trading |
| `/labs/social-feed` | SocialFeedPage | Team activity |
| `/labs/voice-control` | VoiceControlPage | Voice commands |
| `/labs/project-wiki` | WikiPage | Knowledge base |
| `/labs/meeting-assistant` | MeetingAssistantPage | Meeting notes |
| `/labs/notification-digest` | NotificationDigestPage | Digests |
| `/labs/risk-assessment` | RiskAssessmentPage | Risk analysis |
| `/labs/career-compass-2` | CareerCompassPage | Career planning |
| `/labs/decision-journal` | DecisionJournalPage | Decisions |
| `/labs/knowledge-graph` | KnowledgeGraphPage | Relations |
| `/labs/learning-path` | LearningPathPage | Learning |
| `/labs/skills-dashboard` | SkillsDashboard | Overview |

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