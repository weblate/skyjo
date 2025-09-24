# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

IMPORTANT: You MUST strive for elegant, minimal solutions that eliminate complexity and bugs. Remove all backward compatibility and legacy code. YOU MUST prioritize simple, readable code with minimal abstraction—avoid premature optimization.

## Common Development Commands

### Build Commands
```bash
# Build all packages and apps
pnpm build

# Build specific app/package
pnpm build --filter @skymo/api
pnpm build --filter @skymo/web
pnpm build --filter @skymo/core

# Build with Turbo (cached and parallel)
pnpm turbo run build
```

### Development Commands
```bash
# Start all development servers
pnpm dev

# Start specific app in dev mode
pnpm dev --filter @skymo/api
pnpm dev --filter @skymo/web
pnpm dev --filter @skymo/workers
pnpm dev --filter @skymo/discord-bot

# Start Docker services (Redis, PostgreSQL, Seq)
docker compose up -d
docker compose -f compose.dev.yml up -d  # for development
```

### Linting and Formatting
```bash
# Run Biome check and format
pnpm biome:check

# Check specific package
pnpm biome:check --filter @skymo/api
pnpm biome:check --filter @skymo/web

# Turbo run all biome checks
pnpm turbo run biome:check
```

### Testing Commands
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Test specific package
pnpm test --filter @skymo/api
pnpm test --filter @skymo/core
pnpm test --filter @skymo/web

# Run a single test file
pnpm test --filter @skymo/api src/realtime/game/__tests__/game.service.test.ts
```

### Database Commands
```bash
# Generate database migrations
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Database commands with Turbo
pnpm turbo run db:generate
pnpm turbo run db:migrate
```

## High-Level Architecture

### Monorepo Structure
This is a TypeScript monorepo using pnpm workspaces and Turborepo for build orchestration. The project implements a real-time multiplayer Skyjo card game with the following architecture:

### Applications (`apps/`)

#### API Server (`apps/api/`)
- **Framework**: Hono (lightweight web framework) + Socket.IO for real-time communication
- **Key Responsibilities**:
  - HTTP REST endpoints for authentication, user management, and game statistics
  - WebSocket server for real-time game events and chat
  - Queue management using BullMQ for background jobs
  - Redis for game state caching and Socket.IO adapter
- **Architecture Pattern**: Service-based architecture with separate HTTP and realtime modules
- **Authentication**: Session-based with OAuth support (Google, Facebook)

#### Web Client (`apps/web/`)
- **Framework**: Next.js 15 with App Router
- **Key Features**:
  - Server-side rendering with React Server Components
  - Internationalization with next-intl (20+ languages)
  - Real-time game UI with Socket.IO client
  - Responsive design with Tailwind CSS and shadcn/ui components
- **State Management**: React Context for game state, settings, and authentication

#### Background Workers (`apps/workers/`)
- **Purpose**: Async task processing
- **Tasks**: Email notifications, game data persistence, account deletion, database cleanup
- **Queue System**: BullMQ with Redis backend

#### Discord Bot (`apps/discord-bot/`)
- **Purpose**: Discord integration for game reports and moderation
- **Features**: Report handling, user verification

### Core Packages (`packages/`)

#### Core Game Logic (`packages/core/`)
- **Purpose**: Pure game logic implementation
- **Key Classes**:
  - `Game`: Main game state and rules engine
  - `Player`: Player state and actions
  - `Card`: Card properties and special effects
  - `GameOperationManager`: Manages atomic game state changes
- **Design Pattern**: Domain-driven design with immutable operations

#### State Operations (`packages/state-operations/`)
- **Purpose**: Deterministic state transformations
- **Pattern**: Command pattern with operation creation and application
- **Benefits**: Enables undo/redo, replay, and state synchronization

#### Database (`packages/database/`)
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: Users, games, statistics, reports, feedback
- **Migrations**: Version-controlled schema migrations

#### Shared Types (`packages/shared/`)
- **Purpose**: Shared TypeScript types and Zod validation schemas
- **Contents**: API contracts, WebSocket events, validation rules

### Data Flow Architecture

1. **Client Action** → WebSocket event to API server
2. **API Server** → Validates action using core game logic
3. **Game State Update** → Applied through state operations
4. **Redis Cache** → Stores active game state
5. **Broadcast** → Socket.IO broadcasts state changes to all clients
6. **Client Update** → React components re-render with new state
7. **Background Jobs** → Queue tasks for async processing (game storage, notifications)

### Key Design Patterns

- **Event-Driven Architecture**: Socket.IO for real-time bidirectional communication
- **Command Pattern**: State operations for predictable state changes
- **Repository Pattern**: Data access layer abstraction
- **Service Layer**: Business logic separated from transport layer
- **Queue-Based Processing**: Async tasks handled by dedicated workers

### Infrastructure Components

- **Redis**: Game state cache, Socket.IO adapter, BullMQ backend
- **PostgreSQL**: Persistent storage for users, game history, statistics
- **Seq**: Structured logging and monitoring
- **Docker**: Containerized services for consistent development/production

### Testing Strategy

- **Unit Tests**: Core game logic, state operations, utilities
- **Integration Tests**: API endpoints, WebSocket events
- **Test Framework**: Vitest with coverage thresholds (90% for critical paths)
- **Mocking**: External services and dependencies

### Security Measures

- **Input Validation**: Zod schemas for all user inputs
- **Rate Limiting**: API and WebSocket event throttling
- **Authentication**: Secure session management with httpOnly cookies
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Protection**: React's built-in escaping, Content Security Policy

This architecture ensures scalability, maintainability, and real-time performance for thousands of concurrent games.

## Best Practices

- to use environment variables in @apps/api/, write import { ENV } from "@env" and use ENV.VARIABLE_NAME
- do not build every time
- Never remove or add package like this. use pnpm remove and pnpm add
- When you are following a file plan, please update it at the end to your current progression