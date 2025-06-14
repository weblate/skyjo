# Anti-Cheat System for Winstreaks

## Overview

This document outlines the comprehensive anti-cheat system implemented to prevent manipulation of winstreak statistics in the Skymo game platform. The system analyzes multiple factors to detect suspicious game patterns and flags games that may be artificial or manipulated.

## Problem Statement

Players could easily manipulate winstreaks through several methods:
1. **Private Games with Friends** - Creating private games and having friends intentionally lose
2. **Quick/Short Games** - Setting games to end at very low scores (e.g., 10 points) for rapid wins
3. **Coordinated Quitting** - Having players leave at strategic times to ensure specific winners
4. **Rapid Game Farming** - Playing many games in quick succession to build streaks artificially

## Solution Components

### 1. Database Schema Enhancements

**Games Table New Fields:**
- `valid_for_streaks` (boolean) - Whether the game counts toward winstreaks
- `suspicion_level` (smallint) - Suspicion score from 0-100
- `game_duration_ms` (integer) - Game duration in milliseconds
- `players_finished_count` (smallint) - Number of players who actually finished

**Players Table New Fields:**
- `total_play_time_ms` (integer) - Time player was actively playing
- `turns_played` (smallint) - Number of turns the player took
- `quick_win_flags` (smallint) - Flags for suspicious quick wins

### 2. Anti-Cheat Detection Algorithms

The system analyzes each completed game using multiple criteria:

#### A. Game Settings Analysis
- **Very Short Games**: Games ending below 50 points (+40 suspicion)
- **Extremely Fast Completion**: Games completed in under 2 minutes (+50 suspicion)

#### B. Player Behavior Analysis
- **Private Games with Few Players**: Private games with less than 3 players (+25 suspicion)
- **Score Domination**: Winner beats second place by 30+ points (+20 suspicion)
- **Coordinated Quitting**: Insufficient players finishing the game (+30 suspicion)

#### C. Pattern Analysis
- **Rapid Consecutive Games**: Multiple wins in short time windows (+15 suspicion)
- **Frequent Same Opponents**: Playing repeatedly with same players (+20 suspicion)

#### D. Validation Threshold
- Games with suspicion level ≤ 30% are considered valid for streaks
- Games above this threshold are marked as `valid_for_streaks = false`

### 3. Enhanced User Statistics

**New Statistics Added:**
- `currentWinStreak` - Current consecutive wins (valid games only)
- `longestWinStreak` - Longest streak achieved (valid games only)
- `validWins` - Total wins from non-suspicious games

### 4. Implementation Details

#### Game Storage Worker Enhancement
```typescript
// Calculate anti-cheat metrics during game storage
const gameDurationMs = new Date().getTime() - new Date(game.createdAt).getTime()
const connectedPlayersCount = game.players.filter(p => p.connectionStatus === 1).length

// Apply detection algorithms
let suspicionLevel = 0
if (game.settings.scoreToEndGame < 50) suspicionLevel += 40
if (gameDurationMs < 2 * 60 * 1000) suspicionLevel += 50
// ... additional checks

// Mark validity
const validForStreaks = suspicionLevel <= 30
```

#### Winstreak Calculation
```typescript
// Only count games marked as valid for streaks
const games = await db
  .select({ winner: playerTable.winner })
  .from(playerTable)
  .innerJoin(gameTable, eq(playerTable.gameId, gameTable.id))
  .where(and(
    eq(userTable.username, username),
    eq(gameTable.validForStreaks, true) // Key filter
  ))
  .orderBy(desc(gameTable.finishedAt))

// Calculate streaks from valid games only
```

### 5. User Interface Updates

The user profile now displays:
- Current Win Streak (from valid games)
- Longest Win Streak (from valid games)
- Total Valid Wins vs Total Wins

### 6. Configuration Parameters

```typescript
const ANTI_CHEAT_CONFIG = {
  minGameDurationMs: 2 * 60 * 1000,     // 2 minutes minimum
  maxSuspicionForStreaks: 30,            // 30% max suspicion
  quickGameScoreThreshold: 50,           // Games below 50 points flagged
  minPlayersForValidStreak: 3,           // Need 3+ players for valid streak
  maxSameOpponentRatio: 0.7,             // Max 70% games with same opponents
  suspiciousGameWindowHours: 1,          // 1-hour window for rapid games
  maxRapidGamesCount: 5,                 // Max 5 games per hour
}
```

### 7. Performance Optimizations

- **Database Indexes**: Added on `valid_for_streaks`, `suspicion_level`, and `(user_id, winner)`
- **Efficient Queries**: CTE-based queries for player game history
- **Batch Processing**: Anti-cheat analysis during existing game storage workflow

## Benefits

1. **Fair Competition**: Ensures winstreaks reflect genuine skill and dedication
2. **Reduced Manipulation**: Makes it significantly harder to artificially boost stats
3. **Flexible Thresholds**: Configurable suspicion levels allow fine-tuning
4. **Transparent System**: Players understand what makes games count toward streaks
5. **Performance Efficient**: Minimal impact on game performance and storage

## Future Enhancements

1. **Machine Learning**: Advanced pattern detection using historical data
2. **Community Reporting**: Allow players to report suspicious behavior
3. **Admin Dashboard**: Tools for reviewing and adjusting suspicious games
4. **Temporal Analysis**: Detect unusual playing patterns across longer time periods
5. **IP/Device Tracking**: Additional validation for account relationships

## Migration Notes

- New fields are added with sensible defaults
- Existing games are marked as valid by default
- The system only affects future winstreak calculations
- No disruption to current game functionality

This anti-cheat system provides a robust foundation for maintaining fair winstreak competition while remaining flexible enough to adapt to new cheating methods as they emerge. 