@AGENTS.md

# TaskFlow - Task Management Application

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── (pages)/           # App pages
├── components/
│   ├── sidebar/           # Navigation sidebar
│   ├── task/              # Task-related components
│   └── ui/                # Shared UI components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── actions/           # Server actions
│   ├── ai/                # AI integration
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

### Views
- Today / Next 7 Days / Upcoming
- Kanban Board
- Gantt Chart (coming soon)
- Eisenhower Matrix
- Calendar
- Analytics Dashboard

### Task Management
- Recurring tasks
- Time tracking with Pomodoro
- Task dependencies (blockers)
- Labels and filters
- Templates
- Comments and activity log

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

### AI Integration
Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for advanced AI features.

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