import type { Error as ThrownError } from "@skymo/error"
import type {
  UpdateGameSettings,
  UpdateMaxPlayers,
} from "../../validations/updateGameSettings.js"

export type ErrorUpdateMaxPlayersMessage = Extract<
  ThrownError,
  "max-players-too-low" | "not-allowed"
>

export interface ClientToServerSettingsEvents {
  "game:reset-settings": () => void
  "game:update-max-players": (maxPlayers: UpdateMaxPlayers) => void
  "game:update-settings": (settings: UpdateGameSettings) => void
  "game:settings:toggle-validation": () => void
}

export interface ServerToClientSettingsEvents {
  "error:update-max-players": (message: ErrorUpdateMaxPlayersMessage) => void
}
