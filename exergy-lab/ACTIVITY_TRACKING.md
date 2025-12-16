# Activity Tracking System

Comprehensive user interaction and AI agent validation tracking system for Exergy Lab.

## Overview

This system tracks **all** field entries, user interactions, and AI agent requests/responses across the platform to enable:

1. **Quality Assurance**: Validate that AI agents are working correctly
2. **User Behavior Analysis**: Understand how users interact with the platform
3. **Debugging**: Track errors and issues in real-time
4. **Performance Monitoring**: Measure response times and success rates
5. **Compliance**: Maintain audit logs for all activities

## Architecture

### Components

1. **Types** (`src/types/activity-log.ts`)
   - `ActivityLog`: Core log structure
   - `ActivityType`: Enum of all trackable activities
   - `LogFilters`: Query filters for retrieving logs
   - `LogStats`: Aggregated statistics

2. **Logger** (`src/lib/activity-logger.ts`)
   - Client-side singleton logger
   - Automatic buffering and flushing
   - Handles page unload with `sendBeacon`
   - Supports batch operations

3. **Store** (`src/lib/log-store.ts`)
   - In-memory log storage
   - Filtering and querying
   - Statistics aggregation
   - **Production**: Replace with PostgreSQL/MongoDB

4. **API Endpoints**
   - `POST /api/logs`: Store activity logs
   - `GET /api/logs`: Retrieve logs with filters
   - `GET /api/logs/stats`: Get statistics

5. **React Hook** (`src/hooks/use-activity-tracking.ts`)
   - `useActivityTracking()`: Main tracking hook
   - `useInputTracking()`: Debounced input tracking
   - Auto page view tracking

## Usage

### Basic Tracking

```typescript
import { useActivityTracking } from '@/hooks/use-activity-tracking'

function MyPage() {
  const { trackFieldInput, trackSearch, trackError } = useActivityTracking()

  const handleSearch = async (query: string) => {
    // Track the input
    trackFieldInput('search_query', query)

    try {
      const results = await searchAPI(query)

      // Track success
      await trackSearch(query, filters, results)
    } catch (error) {
      // Track error
      await trackError('search_execute', error)
    }
  }
}
```

### Tracking Field Inputs

```typescript
// Manual tracking
trackFieldInput('experiment_name', experimentName)

// Debounced tracking (waits 1 second after last change)
const trackInput = useInputTracking('description', 1000)

<textarea
  onChange={(e) => {
    setDescription(e.target.value)
    trackInput(e.target.value)
  }}
/>
```

### Tracking AI Agents

```typescript
const startTime = Date.now()
const aiResponse = await callAI(prompt)
const duration = Date.now() - startTime

await trackAI(
  'generate_discovery',
  prompt,
  aiResponse,
  'Gemini Pro',
  1500, // tokens used
  duration
)
```

## What Gets Tracked

### Automatically Tracked
- ✅ Page views (via `useActivityTracking()`)
- ✅ Page navigation
- ✅ Session IDs
- ✅ User agent
- ✅ IP address (server-side)

### Must Be Manually Tracked
- Field inputs (text, selects, etc.)
- Search queries
- Discovery prompts
- Experiment designs
- Simulation runs
- TEA calculations
- File uploads
- AI agent requests/responses
- Errors

## Tracked Pages

### Search Page (`/search`)
- ✅ Search query inputs
- ✅ Filter changes
- ✅ Search execution
- ✅ Results count
- ✅ Errors

### Discovery Page (`/discovery`)
- ⏳ Discovery prompt inputs
- ⏳ Domain selections
- ⏳ Goal entries
- ⏳ Report generation
- ⏳ AI responses

### Experiments Page (`/experiments`)
- ⏳ Experiment inputs
- ⏳ Parameter configurations
- ⏳ Design generation
- ⏳ Results

### Simulations Page (`/simulations`)
- ⏳ Simulation parameters
- ⏳ Tier selection
- ⏳ Execution
- ⏳ Results

### TEA Generator (`/tea-generator`)
- ⏳ Input parameters
- ⏳ File uploads
- ⏳ Calculations
- ⏳ PDF generation

## Viewing Logs

### Via API

```typescript
// Get logs with filters
const response = await fetch('/api/logs?page=search&startDate=2024-01-01')
const { logs, totalCount } = await response.json()

// Get statistics
const statsResponse = await fetch('/api/logs/stats')
const { stats, recentSessions } = await statsResponse.json()
```

### Admin Dashboard (To Be Implemented)

Path: `/admin/logs`

Features:
- Real-time log viewer
- Filters by date, page, type, user, session
- Search in inputs/outputs
- Statistics dashboard
- Export logs as JSON/CSV
- Session replay
- Error highlighting

## Data Retention

**Current**: In-memory store (max 10,000 logs)
**Production**:
- Store in PostgreSQL with partitioning
- Retention: 90 days for raw logs
- Aggregated stats: 1 year
- Critical errors: Indefinite

## Privacy & Security

1. **PII Handling**:
   - User IDs/emails only for authenticated users
   - IP addresses hashed in production
   - No sensitive data in logs

2. **Access Control**:
   - Logs API requires authentication
   - Admin-only access to full logs
   - Users can only see their own activity

3. **Compliance**:
   - GDPR-compliant with data deletion
   - Export logs on user request
   - Anonymization options

## Performance

- **Buffering**: Logs buffered client-side (max 10 entries)
- **Auto-flush**: Every 5 seconds
- **Debouncing**: Input tracking debounced (1000ms default)
- **Async**: All tracking is non-blocking
- **Lightweight**: ~5KB gzipped

## Example Log Entry

```json
{
  "id": "log_1234567890_abc123",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "sessionId": "session_1234567890_xyz789",
  "userId": "user_abc123",
  "userEmail": "researcher@example.com",
  "type": "search_query",
  "page": "search",
  "action": "execute_search",
  "inputs": {
    "query": "solar panel efficiency improvements",
    "filters": {
      "yearRange": { "start": 2020, "end": 2024 },
      "domains": ["solar-energy"]
    }
  },
  "outputs": {
    "resultsCount": 15,
    "results": [...]
  },
  "success": true,
  "duration": 1234,
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "hash:abc123..."
}
```

## Next Steps

1. ✅ Core infrastructure
2. ✅ Search page tracking
3. ⏳ Add tracking to remaining pages
4. ⏳ Build admin logs viewer
5. ⏳ Add database persistence
6. ⏳ Implement data retention policies
7. ⏳ Add export functionality
8. ⏳ Build analytics dashboard

## Contributing

When adding a new feature:

1. Import tracking hook:
   ```typescript
   import { useActivityTracking } from '@/hooks/use-activity-tracking'
   ```

2. Track all field inputs:
   ```typescript
   const { trackFieldInput } = useActivityTracking()
   trackFieldInput('field_name', value)
   ```

3. Track API calls with results:
   ```typescript
   await trackSearch(query, filters, results)
   ```

4. Track errors:
   ```typescript
   await trackError('action_name', error)
   ```

5. Test that logs appear in `/api/logs`
