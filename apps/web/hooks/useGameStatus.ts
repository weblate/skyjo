import type { GameStatusResponse } from "@skymo/shared/types"
import { useQuery } from "@tanstack/react-query"
import { getGameStatus } from "@/utils/gameStatus"

interface UseGameStatusReturn {
  gameExists: boolean | null // null = loading, true = exists, false = doesn't exist
  gameStatus: GameStatusResponse | null
  gameFetching: boolean
  error: string | null
}

export function useGameStatus(
  gameCode: string | undefined,
): UseGameStatusReturn {
  const {
    data: gameStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["gameStatus", gameCode],
    queryFn: () => getGameStatus(gameCode!),
    enabled: !!gameCode,
    retry: false,
  })

  return {
    gameExists: isLoading ? null : gameStatus !== null,
    gameStatus: gameStatus || null,
    gameFetching: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
