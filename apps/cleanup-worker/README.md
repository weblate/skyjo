# Cleanup Worker

This service is responsible for asynchronously handling resource-intensive cleanup tasks to prevent memory spikes in the main API.

## Problem Solved

The main API was experiencing memory spikes and crashes when performing intensive operations, especially under high load. This happened because:

1. Operations like key deletion would load all items into memory at once
2. Multiple similar operations might run simultaneously, amplifying the issue
3. The Node.js event loop would get blocked during intensive operations

## Architecture

The cleanup worker uses a modular, extensible architecture:

```
src/
├── tasks/             # Task implementations for different cleanup operations
│   └── GameCleanupTask.ts  # Game-related cleanup tasks
├── services/          # Shared services
│   └── RedisService.ts     # Redis connection management
├── workers/           # Worker implementations
│   ├── BaseWorker.ts       # Abstract base worker with common functionality
│   └── GameCleanupWorker.ts # Game-specific worker implementation
├── index.ts           # Main entry point
└── env.ts             # Environment configuration
```

## How It Works

The cleanup worker:

1. Runs as a separate Node.js process in its own container
2. Uses a class-based architecture for easy extension
3. Provides task-specific implementations for different cleanup operations
4. Processes operations in small batches with event loop yielding
5. Handles proper connection cleanup and error recovery
6. Logs all operations for monitoring

## Adding New Tasks

To add a new task type:

1. Create a new task class in `src/tasks/`
2. Create a new worker class in `src/workers/` that extends BaseWorker
3. Add the worker initialization to `index.ts`

Example:

```typescript
// 1. Create a task in src/tasks/UserCleanupTask.ts
export interface UserCleanupData {
  userId: string
}

export class UserCleanupTask {
  public static async cleanupUser(userId: string): Promise<any> {
    // Implementation
  }
}

// 2. Create a worker in src/workers/UserCleanupWorker.ts
export class UserCleanupWorker extends BaseWorker<UserCleanupData> {
  // Implementation
}

// 3. Add to index.ts
const userCleanupWorker = UserCleanupWorker.getInstance()
const workers = [gameCleanupWorker, userCleanupWorker]
```

## Benefits

- **Extensible**: Easy to add new task types without modifying existing code
- **Maintainable**: Clear separation of concerns between tasks and workers
- **Non-blocking**: The main API returns immediately after scheduling tasks
- **Resilient**: Failed tasks are automatically retried
- **Isolated**: Memory spikes during processing don't affect the main API
- **Observable**: All operations are logged and can be monitored
- **Resource-efficient**: Controlled concurrency and rate limiting

## Configuration

Each worker is configured with its own:

- Concurrency limits
- Rate limiting
- Job retry with exponential backoff
- Resource management

## Deployment

The worker is deployed as a Docker container alongside the main API:

```bash
docker-compose up -d
``` 