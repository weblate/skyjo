# Winstreak

## Blocked by tasks
- Ranked games

## Description
Add a winstreak system to the game. The winstreak is a number of games in a row that the player has won.
The winstreak is reset to 0 when the player loses a game.
The winstreak is displayed in the profile page.
The winstreak is displayed in the leaderboard page.

The winstreak is only for ranked games. This means that players have to be connected with their account.

### Anti-cheat system
Since it's a winstreak system, we need to be sure that the player is not cheating.
In game table add:
- suspicionLevel: smallint("suspicion_level").notNull().default(0),
- suspicionReasons: json("suspicion_reasons").$type<CheatSuspicionReason[]>(),

#### Cheat suspicion reasons
List of suspicion reasons:
- Game finished too quickly (less than X minutes)
- Game finished with a suspiciously low score (less than Y points) (ratio with time elapsed during the game)
- Often the same opponents
- New account boosting ?

#### Reasons that invalid the game to be counted in the winstreak
- A player left
- 
