# TaskFlow Deployment Guide

## Prerequisites

- Node.js 18+ or Bun
- SQLite (included in dependencies)
- A database file location writable by the application

## Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Configure the following environment variables:

### Required
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your application URL (e.g., `https://your-domain.com`)

### Optional but Recommended
- `AUTH_DEMO_MODE=false` - Disable demo mode in production
- `OPENAI_API_KEY` - For AI features
- `ANTHROPIC_API_KEY` - For AI features
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google Calendar sync
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` - For Outlook Calendar sync
- `SMTP_HOST`, `SMTP_PASS` - For email notifications

## Database Setup

The database is automatically initialized on first run. The database file is stored at:
```
data/planner.db
```

For production, consider:
1. Backing up the database regularly
2. Using a more robust database like PostgreSQL

## Running the Application

### Development
```bash
npm run dev
# or
bun dev
```

### Production Build
```bash
npm run build
npm run start
```

## WebSocket Server (Optional)

For real-time collaboration features:

1. Install dependencies:
```bash
npm install ws @types/ws --save-dev
```

2. Start the WebSocket server:
```bash
npx ts-node src/server/ws-server.ts
# or
npx tsx src/server/ws-server.ts
```

The server runs on port 3001 by default (configurable via `WS_PORT` env var).

## Scheduled Jobs

### Recurring Tasks

Set up a cron job to generate recurring tasks:

```bash
# Daily at midnight
0 0 * * * curl https://your-domain.com/api/cron/tasks
```

### Reminders

Set up a cron job to run reminder notifications:

```bash
# Every hour
0 * * * * curl https://your-domain.com/api/cron/reminders
```

## API Endpoints

### Export Formats

- `GET /api/export/json` - Full JSON export
- `GET /api/export/csv` - CSV format
- `GET /api/export/ical` - iCal for calendar apps
- `GET /api/export/pdf` - Text-based export

### AI Features

- `POST /api/ai` - Parse tasks, generate insights, convert notes
  - `{ type: "parse", input: { text: "..." } }`
  - `{ type: "insights", input: { tasks: [...] } }`
  - `{ type: "generateTasks", input: { notes: "..." } }`
- `GET /api/ai` - Get AI provider status

### Time Tracking

- `GET /api/tasks/time-report` - Get time tracking reports
  - `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&taskId=123`

### Offline Sync

- `PUT /api/tasks` - Sync operations
  - `{ action: "sync" }` - Sync pending offline tasks
  - `{ action: "status" }` - Get sync status
  - `{ action: "clear" }` - Clear synced tasks

## OAuth Setup

### Google Calendar
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Calendar API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `https://your-domain.com/api/auth/callback/google`

### Microsoft Outlook
1. Go to [Microsoft Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add API permission: `Calendars.ReadWrite`
4. Add redirect URI: `https://your-domain.com/api/auth/callback/microsoft`

## Deployment to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Project Settings
4. Deploy

## Deployment to Other Platforms

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### systemd Service (Linux)
```ini
[Unit]
Description=TaskFlow Application
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

## Backup Strategy

1. Database backup:
```bash
cp data/planner.db backups/planner-$(date +%Y%m%d).db
```

2. Export data via API:
```bash
curl https://your-domain.com/api/export/json > backup.json
```

## Monitoring

Consider adding:
- Error tracking (Sentry, LogRocket)
- Performance monitoring (Vercel Analytics, New Relic)
- Uptime monitoring (UptimeRobot, Pingdom)