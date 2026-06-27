# TaskFlow - Task Management Application

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

### Technical Features
- **PWA Support**: Installable on mobile devices
- **Offline Support**: Works offline with local storage sync
- **Dark/Light Mode**: System-aware theming
- **Mobile Responsive**: Optimized for all screen sizes

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

### Calendar Sync
Configure Google Calendar API credentials in your `.env.local`:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Calendar API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/
│   ├── sidebar/          # Navigation sidebar
│   ├── task/             # Task-related components
│   └── ui/               # Shared UI components
├── hooks/                # Custom React hooks
├── lib/
│   ├── actions/          # Server actions
│   ├── ai/               # AI integration
│   ├── calendar/         # Calendar sync
│   ├── db/               # Database layer
│   └── validation.ts     # Zod validation schemas
└── types/                # TypeScript types
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + N` | Create new task |
| `⌘/Ctrl + /` | Focus search |
| `⌘/Ctrl + K` | Open AI Assistant |
| `⌘/Ctrl + 1` | Today view |
| `⌘/Ctrl + 2` | Kanban board |
| `⌘/Ctrl + 3` | Analytics |
| `?` | Show keyboard shortcuts |

## Export Formats

- **JSON** - Full data export with all relations
- **iCal** - Calendar integration
- **CSV** - Spreadsheet import

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET/POST | Task CRUD |
| `/api/task/[id]` | GET/PUT/DELETE | Individual task |
| `/api/shares` | GET/POST/DELETE | Task sharing |
| `/api/ai` | POST | AI parsing |
| `/api/tasks/time-report` | GET | Time tracking |

## License

MIT