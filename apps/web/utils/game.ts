import { Constants as CoreConstants, GameStatus } from "@skymo/core"
import { ErrorJoinMessage } from "@skymo/shared/types"
import { type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { toast } from "sonner"

export const handleGameJoinSuccess = (
  code: string,
  status: GameStatus,
  playerId: string,
  router: AppRouterInstance,
) => {
  localStorage.setItem(
    "lastGame",
    JSON.stringify({
      gameCode: code,
      playerId,
    }),
  )

  if (status === CoreConstants.GAME_STATUS.LOBBY)
    router.replace(`/game/${code}/lobby`)
  else router.replace(`/game/${code}`)
}

export const handleGameJoinError = (
  message: ErrorJoinMessage,
  router: AppRouterInstance,
  errorMessages: Record<ErrorJoinMessage, string>,
) => {
  toast.error(errorMessages[message], {
    duration: 5000,
  })

  router.replace(document?.referrer ?? "/")
}
