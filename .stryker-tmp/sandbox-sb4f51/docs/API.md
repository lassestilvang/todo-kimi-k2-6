# TaskFlow API Documentation

This document describes the REST API endpoints for TaskFlow.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Most endpoints require authentication via NextAuth.js session cookies. Include credentials in your requests.

## Endpoints

### Tasks

#### `GET /api/tasks`
Retrieve all tasks with optional filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `list_id` | number | Filter by list ID |
| `completed` | boolean | Filter by completion status |
| `include_completed` | boolean | Include completed tasks |
| `search` | string | Search term |

**Response:** `TaskWithRelations[]`

#### `POST /api/tasks`
Create a new task.

**Body:** `CreateTaskRequest`
```typescript
{
  name: string;
  description?: string;
  list_id?: number;
  deadline?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
  recurring?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly' | 'custom';
  recurring_config?: string;
  assignee_id?: number;
  label_ids?: number[];
}
```

#### `GET /api/tasks/[id]`
Retrieve a single task with all relations.

**Response:** `TaskWithRelations`

#### `PUT /api/tasks/[id]`
Update a task.

**Body:** `UpdateTaskRequest`

#### `DELETE /api/tasks/[id]`
Delete a task.

### Lists

#### `GET /api/lists`
Retrieve all lists.

**Response:** `List[]`

#### `POST /api/lists`
Create a new list.

**Body:** `{ name: string; emoji?: string; color?: string }`

### Labels

#### `GET /api/labels`
Retrieve all labels.

**Response:** `Label[]`

#### `POST /api/labels`
Create a new label.

**Body:** `{ name: string; icon?: string; color?: string }`

### AI Assistant

#### `POST /api/ai`
Parse natural language text into task data.

**Body:** `{ text: string }`

**Response:**
```typescript
{
  name: string;
  description?: string;
  deadline?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
  estimated_time?: string;
}
```

### Time Tracking

#### `GET /api/time-entries`
Retrieve time entries.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `task_id` | number | Filter by task ID |

#### `POST /api/time-entries`
Start a new time entry.

**Body:** `{ task_id: number; description?: string }`

#### `PUT /api/time-entries/[id]`
End a time entry.

**Body:** `{ end_time: string }`

### Reminders

#### `POST /api/reminders`
Create a reminder for a task.

**Body:** `{ task_id: number; remind_at: string }`

### Auth

#### `POST /api/auth/[...nextauth]/signin`
Sign in with credentials.

#### `POST /api/auth/[...nextauth]/signup`
Sign up a new user.

#### `POST /api/auth/[...nextauth]/logout`
Sign out the current user.

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

API endpoints are rate-limited:
- **API routes**: 100 requests per minute
- **Auth routes**: 10 requests per 15 minutes
- **AI routes**: 20 requests per minute

Rate-limited responses return HTTP 429 with:
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMITED",
  "resetTime": 1234567890000
}
```

## Data Types

### Task Priority
- `critical` - Red, highest priority
- `high` - Orange, high priority
- `medium` - Yellow, medium priority
- `low` - Blue, low priority
- `none` - Gray, no priority

### Recurring Types
- `none` - No recurrence
- `daily` - Every day
- `weekly` - Every week
- `weekdays` - Monday-Friday
- `monthly` - Every month
- `yearly` - Every year
- `custom` - Custom recurrence pattern

## Webhooks

TaskFlow supports webhooks for external integrations. Configure them in the integrations settings.

### Incoming Webhooks
- **URL**: `/api/webhooks/[token]`
- **Method**: POST
- **Body**: Task creation payload