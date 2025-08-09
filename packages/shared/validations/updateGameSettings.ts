import { Constants as CoreConstants } from "@skymo/core"
import { z } from "zod"

export const updateMaxPlayersSchema = z
  .number()
  .int()
  .min(CoreConstants.DEFAULT_GAME_SETTINGS.MIN_PLAYERS, "min-players-invalid")
  .max(CoreConstants.DEFAULT_GAME_SETTINGS.MAX_PLAYERS, "max-players-invalid")

export type UpdateMaxPlayers = z.input<typeof updateMaxPlayersSchema>

export const updateGameSettingsSchema = z.object({
  removeIdenticalColumn: z.boolean().optional(),
  removeIdenticalRow: z.boolean().optional(),
  initialTurnedCount: z.number().int().min(0).optional(),
  cardPerRow: z
    .number()
    .int()
    .min(1, "card-per-row-min-invalid")
    .max(
      CoreConstants.DEFAULT_GAME_SETTINGS.CARDS.PER_ROW,
      "card-per-row-max-invalid",
    )
    .optional(),
  cardPerColumn: z
    .number()
    .int()
    .min(1, "card-per-column-min-invalid")
    .max(
      CoreConstants.DEFAULT_GAME_SETTINGS.CARDS.PER_COLUMN,
      "card-per-column-max-invalid",
    )
    .optional(),
  scoreToEndGame: z
    .number()
    .int()
    .min(1, "score-to-end-game-min-invalid")
    .max(10000000, "score-to-end-game-max-invalid")
    .optional(),
  firstPlayerMultiplierPenalty: z
    .number()
    .int()
    .min(1, "first-player-multiplier-penalty-min-invalid")
    .max(10000000, "first-player-multiplier-penalty-max-invalid")
    .optional(),
  firstPlayerFlatPenalty: z
    .number()
    .int()
    .min(0, "first-player-flat-penalty-min-invalid")
    .max(10000000, "first-player-flat-penalty-max-invalid")
    .optional(),
  firstPlayerPenaltyType: z
    .nativeEnum(CoreConstants.FIRST_PLAYER_PENALTY_TYPE)
    .optional(),
  showCurrentScore: z.boolean().optional(),
})

export type UpdateGameSettings = z.input<typeof updateGameSettingsSchema>
