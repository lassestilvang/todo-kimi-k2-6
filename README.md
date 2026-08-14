# TaskFlow - Task Management Application

[![Auditing](https://github.com/lasse/todo-kimi-k2-6/actions/workflows/test.yaml/badge.svg)](https://github.com/lasse/todo-kimi-k2-6/actions/workflows/test.yaml)

A modern, full-featured task management application built with Next.js, featuring AI-powered task parsing, collaboration tools, and advanced analytics.

## Features

### Core Features

- **Multi-view Task Management**: Today, Next 7 Days, Upcoming, Kanban Board, Gantt Chart, Eisenhower Matrix
- **AI Assistant**: Natural language task parsing with OpenAI/Claude integration (falls back to keyword parsing)
- **Task Dependencies**: Blockers and dependency tracking with visual graph
- **Time Tracking**: Pomodoro timer, time entries, and detailed reports
- **Templates**: Reusable task templates for consistent task creation
- **Labels & Filters**: Organize tasks with labels and save filter presets

### Collaboration

- **Task Sharing**: Share tasks with view/edit permissions
- **Comments**: Discuss tasks with team members
- **Public Share Links**: Share tasks via link with configurable permissions

### Analytics & Reporting

- **Productivity Dashboard**: Completion rates, streaks, and goal tracking
- **Time Reports**: Visualize time spent on tasks
- **Priority Distribution**: See task breakdown by priority
- **Completion Trends**: Weekly and monthly progress tracking

### Focus & Productivity

- **Focus Mode**: Distraction-free task management
- **Pomodoro Timer**: Built-in time management
- **Keyboard Shortcuts**: Full keyboard navigation support

### TaskFlow Labs (New!)

Interactive AI-powered productivity experiments:

- **AI Playground**: Compare OpenAI, Claude, and keyword parser on task parsing
- **Project Planner**: Generate full project plans from natural language
- **Skills Tracker**: Track skill development through completed tasks
- **Energy Scheduler**: Optimize task timing based on energy patterns
- **Success Stories**: Reflect on completed tasks and capture insights

## Getting Started

### Prerequisites

- Node.js 20+
- npm (or your preferred package manager)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd todo-kimi-k2-6
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

- `NEXTAUTH_SECRET` - Secret for authentication
- `OPENAI_API_KEY` - Optional: For AI features
- `ANTHROPIC_API_KEY` - Optional: For AI features
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Optional: For calendar sync

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:component # Run component tests
npm run test:all     # Run all tests
npm run test:coverage # Generate coverage report
```

## Configuration

### AI Integration

Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for advanced AI features:

- Natural language task parsing
- Smart scheduling suggestions
- Productivity insights
- Project plan generation
- Decision templates

### Calendar Sync

Configure Google Calendar API credentials in your `.env.local`:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Calendar API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

## TaskFlow Labs

Explore the Labs section to experiment with AI-powered productivity:

- **AI Playground** (`/labs`): Compare different AI models and their task parsing results
- **Project Planner** (`/labs/project-planning`): Generate project plans from natural language
- **Skills Tracker** (`/labs/skills`): Track skill development through your work
- **Energy Scheduler** (`/labs/energy`): Optimize your schedule based on energy patterns
- **Success Stories** (`/labs/stories`): Capture insights from completed tasks

## New Features (v0.2.0)

### Smart Inbox Automation

- **Multi-source Aggregation**: Collect tasks from calendar, email, Slack, GitHub, and other integrations
- **AI-powered Prioritization**: Automatic priority scoring based on due dates and importance
- **One-click Conversion**: Convert external items directly to tasks
- **Conflict Resolution**: Merge and deduplicate similar tasks

### Team Velocity Dashboard

- **Sprint Tracking**: Monitor team velocity across multiple sprints
- **Burndown Charts**: Visualize progress against sprint goals
- **Capacity Planning**: Predict optimal sprint size based on historical data
- **Health Score**: Real-time team performance indicator

### Advanced Analytics

- **60-day Streak Calendar**: Extended productivity tracking
- **Heatmap Visualization**: Daily productivity patterns
- **Day-of-Week Analysis**: Identify peak productivity times
- **Trend Projections**: Predict future completion rates

### Workflow Automation (Beta)

- **No-code Builders**: Visual workflow creation with drag-and-drop interface
- **Multi-trigger Support**: Manual, scheduled, task-created, task-completed, and due-date triggers
- **Action Templates**: Create tasks, update tasks, send notifications, log messages, call webhooks
- **Execution History**: Track and debug workflow runs with detailed logs

### Predictive Analytics

- **AI-Powered Recommendations**: Task completion predictions based on historical data
- **Capacity Planning**: Work capacity utilization with alerts for over/under allocation
- **Risk Assessment**: Identify overdue tasks and upcoming deadlines
- **Pattern Recognition**: AI-analyzed task patterns and suggestions

### Knowledge Graph 2.0

- **Task Connections**: Automatic relationship detection for related tasks
- **Pattern Analysis**: Extract recurring patterns from completed tasks
- **Lessons Learned**: Capture insights from task completion
- **Skill Extraction**: Automatic skill tracking from task history

### Meeting Assistant Lab

- **Voice Recording**: Record meetings directly in-browser
- **Auto Transcription**: Extract action items from meeting transcripts
- **Task Conversion**: Convert meeting action items to tasks
- **AI Summary**: Generate meeting summaries and next steps

### Career Navigator (Beta)

- **Skill Extraction**: Automatic skill identification from task history
- **Career Pathing**: AI-generated career recommendations based on your skills
- **Learning Recommendations**: Personalized course and resource suggestions
- **30-Day Action Plan**: Step-by-step skill development roadmap
- **Gap Analysis**: Identify missing skills for target roles

### Voice Commands

- **Speech Recognition**: Control task management with voice
- **Natural Language**: Create, complete, and search tasks by speaking
- **Multilingual**: Support for multiple languages
- **Visual Feedback**: Command history and recognition confidence scores

### Accessibility & Universal Design

- **Color-blind Palettes**: Support for Deuteranopia, Protanopia, Tritanopia, and Achromatopsia
- **Custom Themes**: Switch between accessibility-friendly color schemes
- **Font Options**: Dyslexia-friendly font selection
- **Contrast Modes**: High contrast and reduced motion settings

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── workflows/    # Workflow API
│   │   ├── team-velocity/# Team metrics API
│   │   └── smart-inbox/  # Smart inbox API
│   ├── auth/             # Authentication pages
│   ├── labs/             # Labs pages
│   │   ├── meeting-assistant/  # Meeting recording & transcription
│   │   └── ...
│   └── workflows/        # Workflow management page
├── components/
│   ├── sidebar/          # Navigation sidebar
│   ├── task/             # Task-related components
│   │   ├── ai-assistant.tsx
│   │   ├── task-modal.tsx
│   │   ├── time-report.tsx
│   │   ├── productivity-dashboard.tsx
│   │   ├── team-velocity-dashboard.tsx
│   │   ├── smart-inbox.tsx
│   │   ├── workflow-builder.tsx
│   │   ├── predictive-analytics.tsx
│   │   ├── knowledge-graph-enhanced.tsx
│   │   ├── meeting-recorder.tsx
│   │   ├── career-navigator.tsx
│   │   ├── voice-commands.tsx
│   │   └── ...
│   └── ui/               # Shared UI components
│       ├── color-blind-themes.tsx
│       └── ...
├── hooks/
│   ├── use-voice.ts     # Speech recognition hook
│   └── ...
├── lib/
│   ├── actions/          # Server actions
│   │   ├── workflows.ts       # Workflow actions
│   │   ├── team-metrics.ts
│   │   └── smart-inbox.ts
│   ├── ai/               # AI integration
│   │   ├── contextual.ts           # Contextual AI features
│   │   ├── meeting-transcription.ts
│   │   ├── knowledge-synthesis.ts
│   │   └── career-pathing.ts
│   ├── calendar/         # Calendar sync
│   ├── db/               # Database layer
│   ├── integrations/     # Third-party integrations
│   └── validation.ts     # Zod validation schemas
└── types/                # TypeScript types
```

## Keyboard Shortcuts

| Shortcut     | Action                  |
| ------------ | ----------------------- |
| `⌘/Ctrl + N` | Create new task         |
| `⌘/Ctrl + /` | Focus search            |
| `⌘/Ctrl + K` | Open AI Assistant       |
| `⌘/Ctrl + 1` | Today view              |
| `⌘/Ctrl + 2` | Kanban board            |
| `⌘/Ctrl + 3` | Analytics               |
| `?`          | Show keyboard shortcuts |

## Export Formats

- **JSON** - Full data export with all relations
- **iCal** - Calendar integration
- **CSV** - Spreadsheet import

## API Endpoints

| Endpoint                   | Method                    | Description                 |
| -------------------------- | ------------------------- | --------------------------- |
| `/api/tasks`               | GET/POST                  | Task CRUD                   |
| `/api/task/[id]`           | GET/PUT/DELETE            | Individual task             |
| `/api/shares`              | GET/POST/DELETE           | Task sharing                |
| `/api/ai`                  | POST                      | AI parsing                  |
| `/api/decision-templates`  | GET/POST/PATCH/DELETE     | Decision templates          |
| `/api/ai/parse-comparison` | POST                      | Compare AI models           |
| `/api/tasks/time-report`   | GET                       | Time tracking               |
| `/api/workflows`           | GET/POST/PUT/DELETE/PATCH | Workflow management         |
| `/api/workflows/execute`   | POST                      | Execute a workflow          |
| `/api/team-velocity`       | GET                       | Team metrics and velocity   |
| `/api/smart-inbox`         | GET/POST                  | Smart inbox aggregation     |
| `/api/voice/commands`      | POST                      | Voice command processing    |
| `/api/ai/career-paths`     | GET                       | Career path recommendations |
| `/api/ai/skill-extract`    | POST                      | Extract skills from tasks   |

## License

MIT
