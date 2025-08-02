import { Constants as CoreConstants } from "@skymo/core"
import { LastGame } from "@skymo/shared/validations"
import { cookies } from "next/headers"
import { clearLastGameCookie } from "@/utils/gameCookie"
import { getGameStatus } from "@/utils/gameStatus"

export type CanReconnectResult =
  | {
      lastGame: null
      isPrivate: null
    }
  | {
      lastGame: LastGame
      isPrivate: boolean
    }

export const canReconnect = async (): Promise<CanReconnectResult> => {
  const cookieStore = await cookies()
  const lastGameCookie = cookieStore.get("skymo_last_game")
  const lastGame = lastGameCookie ? JSON.parse(lastGameCookie.value) : null

  if (!lastGame) {
    return {
      lastGame: null,
      isPrivate: null,
    }
  }

  const gameStatus = await getGameStatus(lastGame.gameCode)

  const gameExists = !!gameStatus
  const hasPlayers = (gameStatus?.connectedPlayersCount ?? 0) > 0
  const gameIsPlaying = gameStatus?.status === CoreConstants.GAME_STATUS.PLAYING

  if (!gameExists || !hasPlayers || !gameIsPlaying) {
    clearLastGameCookie()
    return {
      lastGame: null,
      isPrivate: null,
    }
  }

  return {
    lastGame,
    isPrivate: gameStatus?.isPrivate ?? false,
  }
}
