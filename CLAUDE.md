@AGENTS.md

# TaskFlow - Task Management Application

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── ai/            # AI parsing endpoint
│   │   ├── shares/        # Task sharing
│   │   └── task-comments/ # Comments API
│   └── (pages)/           # App pages
├── components/
│   ├── sidebar/           # Navigation sidebar
│   ├── task/              # Task-related components
│   │   ├── ai-assistant.tsx
│   │   ├── task-modal.tsx
│   │   ├── time-report.tsx
│   │   ├── productivity-dashboard.tsx
│   │   └── keyboard-cheatsheet.tsx
│   └── ui/                # Shared UI components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── actions/           # Server actions
│   ├── ai/                # AI integration
│   │   ├── index.ts       # AI interface
│   │   ├── providers.ts   # OpenAI/Claude providers
│   │   └── config.ts      # AI configuration
│   ├── auth/              # Authentication
│   ├── calendar/          # Calendar sync
│   ├── db/                # Database layer
│   └── validation.ts      # Zod validation schemas
└── types/                 # TypeScript types
```

## Key Features

### AI Assistant
- Natural language task parsing
- Priority detection
- Due date extraction
- Smart suggestions
- OpenAI/Claude integration with fallback to keyword parser
- AI status indicator in UI

### Views
- Today / Next 7 Days / Upcoming
- Kanban Board
- Gantt Chart
- Eisenhower Matrix
- Calendar
- Analytics Dashboard
- AI Assistant

### Task Management
- Recurring tasks with custom intervals
- Time tracking with Pomodoro timer
- Task dependencies (blockers)
- Labels and filters
- Templates (reusable task templates)
- Comments and activity log
- Task sharing with permissions

### Collaboration
- Task sharing with view/edit permissions
- Public share links
- User comments on tasks
- Activity timeline

### Analytics & Reporting
- Completion rate tracking
- Productivity dashboard
- Time tracking reports
- Streak calendar
- Priority distribution charts
- Weekly goal tracking

### Focus & Productivity
- Focus mode
- Pomodoro timer
- Keyboard shortcuts (cheat sheet)
- Mobile-responsive design

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:all     # Run all tests
npm run test:coverage # Generate coverage report
npm run stryker      # Run mutation testing
```

## Configuration

See `.env.example` for required environment variables.

### Authentication
Set `NEXTAUTH_SECRET` for user authentication. Demo mode allows any email.

### AI Integration
Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for advanced AI features.
- `OPENAI_MODEL` - Model to use (default: gpt-4o-mini)
- `CLAUDE_MODEL` - Model to use (default: claude-3-5-sonnet-20241022)

### Calendar Sync
Configure Google Calendar API credentials:
1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable Calendar API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

## Architecture Notes

- Uses SQLite with Better-SQLite3 for database
- Server Actions for data mutations
- React Hooks for state management
- Tailwind CSS + shadcn/ui for styling
- Framer Motion for animations
- NextAuth.js for authentication