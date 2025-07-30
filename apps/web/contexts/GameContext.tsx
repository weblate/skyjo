"use client"

import {
  Constants as CoreConstants,
  GameToJson,
  PlayerToJson,
  PlayPickCard,
} from "@skymo/core"
import { Constants as ErrorConstants } from "@skymo/error"
import type { ErrorUpdateMaxPlayersMessage } from "@skymo/shared/types"
import { UpdateGameSettings, UpdateMaxPlayers } from "@skymo/shared/validations"
import {
  applyStateOperations,
  type GameOperation,
} from "@skymo/state-operations"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { useTranslations } from "next-intl"
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Socket } from "socket.io-client"
import { toast } from "sonner"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSocket } from "@/contexts/SocketContext"
import { useAfkKickToasts } from "@/hooks/useAfkKickToasts"
import { useRouter } from "@/i18n/routing"
import {
  getCurrentUser,
  getOpponents,
  isGameFinished,
  isGameLobby,
  isGamePlaying,
  isGameStopped,
  isHost,
  isLastTurnPickFromDiscardPile,
  isLastTurnPickFromDrawPile,
  isLastTurnReplace,
  isLastTurnThrow,
  isLastTurnTurn,
  isRoundLastLap,
  isRoundMain,
  isRoundOver,
  isRoundRevealCards,
  isTurnChooseAPile,
  isTurnReplaceACard,
  isTurnThrowOrReplace,
  isTurnTurnACard,
} from "@/lib/game"
import { Opponents } from "@/types/opponents"
import { clearLastGame } from "@/utils/reconnection"

dayjs.extend(utc)

interface GameContext {
  game: GameToJson
  player: PlayerToJson
  opponents: Opponents
  nbConnectedPlayers: number
  actions: {
    updateMaxPlayers: (maxPlayers: UpdateMaxPlayers) => void
    updateSingleSettings: <T extends keyof UpdateGameSettings>(
      key: T,
      value: UpdateGameSettings[T],
    ) => void
    updateSettings: (settings: UpdateGameSettings) => void
    toggleSettingsValidation: () => void
    resetSettings: () => void
    startGame: () => void
    playRevealCard: (column: number, row: number) => void
    pickCardFromPile: (pile: PlayPickCard["pile"]) => void
    replaceCard: (column: number, row: number) => void
    discardSelectedCard: () => void
    turnCard: (column: number, row: number) => void
    replay: () => void
    leave: (canReconnect?: boolean) => void
  }
  roundPhase: {
    isRevealCards: boolean
    isMain: boolean
    isLastLap: boolean
    isOver: boolean
  }
  gameStatus: {
    isLobby: boolean
    isPlaying: boolean
    isFinished: boolean
    isStopped: boolean
  }
  turnStatus: {
    isChooseAPile: boolean
    isThrowOrReplace: boolean
    isTurnACard: boolean
    isReplaceACard: boolean
  }
  lastTurnStatus: {
    isPickFromDrawPile: boolean
    isPickFromDiscardPile: boolean
    isThrow: boolean
    isReplace: boolean
    isTurn: boolean
  }
}

const GameContext = createContext<GameContext | undefined>(undefined)

interface GameProviderProps extends PropsWithChildren {
  gameCode: string
}

const GameProvider = ({ children, gameCode }: GameProviderProps) => {
  const { socket } = useSocket()
  const { playerId } = usePlayer()
  const router = useRouter()
  const { showAfkWarning, showAfkKick, showPlayerAfkKick } = useAfkKickToasts()
  const tSettingsError = useTranslations("utils.socket.error")

  const [game, setGame] = useState<GameToJson>()

  const lastHiddenAt = useRef<number | null>(null)

  //#region error descriptions
  const updateMaxPlayersErrorDescription = useMemo(
    () => ({
      [ErrorConstants.ERROR.MAX_PLAYERS_TOO_LOW]: tSettingsError(
        "max-players-too-low.description",
      ),
      [ErrorConstants.ERROR.NOT_ALLOWED]: tSettingsError(
        "not-allowed.description",
      ),
    }),
    [tSettingsError],
  )

  const onUpdateMaxPlayersError = useCallback(
    (message: ErrorUpdateMaxPlayersMessage) => {
      toast.error(updateMaxPlayersErrorDescription[message], {
        duration: 5000,
      })
    },
    [updateMaxPlayersErrorDescription],
  )
  //#endregion

  const player = getCurrentUser(game?.players, playerId)
  const opponents = getOpponents(game?.players, playerId)

  const nbConnectedPlayers = useMemo(() => {
    return (
      game?.players.filter(
        (player) =>
          player.connectionStatus !==
          CoreConstants.CONNECTION_STATUS.DISCONNECTED,
      ).length ?? 0
    )
  }, [game?.players])

  const host = isHost(game, player?.id)
  const stateVersion = game?.stateVersion ?? -99

  useEffect(() => {
    if (!gameCode || !socket) return

    initGameListeners()
    initAfkListeners()

    // first time we get the game, we don't have a state version
    socket.emit("get", null, true)

    return () => {
      destroyGameListeners()
      destroyAfkListeners()
    }
  }, [socket, gameCode])

  useEffect(() => {
    socket!.on("leave:success", onLeave)
    return () => {
      socket!.off("leave:success", onLeave)
    }
  }, [game?.settings.private])

  //#region reconnection

  useEffect(() => {
    if (socket?.recovered) socket.emit("recover")
  }, [socket?.recovered])

  // beforeunload to allow reconnection when reopening the tab/website
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!game?.status) return

      const inGame = game?.status === CoreConstants.GAME_STATUS.PLAYING
      if (inGame) event.preventDefault()
      else clearLastGame()
    }

    window.addEventListener("beforeunload", onUnload)

    socket!.on("disconnect", onDisconnect)

    return () => {
      socket!.off("disconnect", onDisconnect)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [game?.status])

  // Get the game when the tab is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAt.current = Date.now()
      } else if (
        lastHiddenAt.current &&
        Date.now() - lastHiddenAt.current >= 30000
      ) {
        socket?.emit("get", game?.stateVersion)
        lastHiddenAt.current = null
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [game?.stateVersion])

  //#endregion

  //#region listeners
  //#region game
  const onGameReceive = (game: GameToJson) => {
    setGame(game)
  }

  const onGameUpdate = (operation: GameOperation) => {
    console.log("onGameUpdate", operation)
    if (!operation) return

    setGame((prev) => {
      if (!prev) return prev
      const prevState = structuredClone(prev)
      const newState = applyStateOperations(prevState, operation)
      return newState
    })
  }

  const onGameFix = (operations: GameOperation[]) => {
    console.log("onGameFix", operations)

    if (!operations || operations.length === 0) return

    setGame((prev) => {
      if (!prev) return prev

      let newState = structuredClone(prev)
      for (const operation of operations) {
        newState = applyStateOperations(newState, operation)
      }
      return newState
    })
  }

  const onLeave = () => {
    setGame(undefined)
    if (game?.settings.private) router.replace("/")
    else router.replace("/search")
  }

  const onDisconnect = (reason: Socket.DisconnectReason) => {
    console.log("onDisconnect", reason === "ping timeout", game?.status)
    if (
      reason === "ping timeout" &&
      game?.status === CoreConstants.GAME_STATUS.LOBBY
    ) {
      if (game?.settings.private) router.replace("/")
      else router.replace("/search")
    } else if (game?.status === CoreConstants.GAME_STATUS.PLAYING) {
      reconnect()
      socket?.on("game:join", () => {
        socket.emit("get", game.stateVersion)
      })
    }
  }

  const MAX_RECONNECT_BACKOFF_MS = 3000
  const reconnect = (attempt = 1, backoffMs = 1000) => {
    try {
      console.log(`Reconnection attempt ${attempt} (delay: ${backoffMs}ms)`)
      socket!.timeout(5000).emit("reconnect", {
        gameCode: game?.code,
        playerId: player?.id,
      })
    } catch (error) {
      console.error("Error reconnecting", error)
      const nextBackoff = Math.min(backoffMs * 1.5, MAX_RECONNECT_BACKOFF_MS)
      setTimeout(() => {
        reconnect(attempt + 1, nextBackoff)
      }, backoffMs)
    }
  }

  const initGameListeners = () => {
    socket!.on("game", onGameReceive)
    socket!.on("game:update", onGameUpdate)
    socket!.on("game:fix", onGameFix)
  }

  const destroyGameListeners = () => {
    socket!.off("game", onGameReceive)
    socket!.off("game:update", onGameUpdate)
    socket!.off("game:fix", onGameFix)
  }
  //#endregion

  //#region afk
  const initAfkListeners = () => {
    socket!.on("kick:afk-warning", showAfkWarning)
    socket!.on("kick:afk", onAfkKick)
    socket!.on("kick:player-afk", showPlayerAfkKick)
  }

  const destroyAfkListeners = () => {
    socket!.off("kick:afk-warning", showAfkWarning)
    socket!.off("kick:afk", onAfkKick)
    socket!.off("kick:player-afk", showPlayerAfkKick)
  }

  const onAfkKick = () => {
    clearLastGame()
    showAfkKick()
    router.replace("/")
  }
  //#endregion

  //#region actions
  const updateMaxPlayers = (maxPlayers: UpdateMaxPlayers) => {
    if (!host) return

    socket!.once("error:update-max-players", onUpdateMaxPlayersError)
    socket!.emit("game:update-max-players", maxPlayers)
  }

  const updateSingleSettings = <T extends keyof UpdateGameSettings>(
    key: T,
    value: UpdateGameSettings[T],
  ) => {
    if (!host) return

    socket!.emit("game:update-settings", {
      [key]: value,
    })
  }

  const toggleSettingsValidation = () => {
    if (!host) return

    socket!.emit("game:settings:toggle-validation")
  }

  const updateSettings = (settings: UpdateGameSettings) => {
    if (!host) return

    socket!.emit("game:update-settings", settings)
  }

  const resetSettings = () => {
    if (!host) return

    socket!.emit("game:reset-settings")
  }

  const startGame = () => {
    if (!host) return

    socket!.emit("start")
  }

  const playRevealCard = (column: number, row: number) => {
    socket!.emit(
      "play:reveal-card",
      {
        column: column,
        row: row,
      },
      stateVersion,
    )
  }

  const pickCardFromPile = (pile: PlayPickCard["pile"]) => {
    socket!.emit(
      "play:pick-card",
      {
        pile,
      },
      stateVersion,
    )
  }

  const replaceCard = (column: number, row: number) => {
    socket!.emit(
      "play:replace-card",
      {
        column: column,
        row: row,
      },
      stateVersion,
    )
  }

  const discardSelectedCard = () => {
    socket!.emit("play:discard-selected-card", stateVersion)
  }

  const turnCard = (column: number, row: number) => {
    socket!.emit(
      "play:turn-card",
      {
        column: column,
        row: row,
      },
      stateVersion,
    )
  }

  const replay = () => {
    socket!.emit("replay", stateVersion)
  }

  const leave = (canReconnect = false) => {
    toast.dismiss()

    if (!canReconnect) localStorage.removeItem("lastGame")

    socket!.emit("leave")
  }

  const actions = {
    updateMaxPlayers,
    updateSingleSettings,
    toggleSettingsValidation,
    updateSettings,
    resetSettings,
    startGame,
    playRevealCard,
    pickCardFromPile,
    replaceCard,
    discardSelectedCard,
    turnCard,
    replay,
    leave,
  }
  //#endregion

  //#region round phases
  const roundPhase = {
    isRevealCards: isRoundRevealCards(game?.roundPhase),
    isMain: isRoundMain(game?.roundPhase),
    isLastLap: isRoundLastLap(game?.roundPhase),
    isOver: isRoundOver(game?.roundPhase),
  }
  //#endregion

  //#region game status
  const gameStatus = {
    isLobby: isGameLobby(game?.status),
    isPlaying: isGamePlaying(game?.status),
    isFinished: isGameFinished(game?.status),
    isStopped: isGameStopped(game?.status),
  }
  //#endregion

  //#region turn status
  const turnStatus = {
    isChooseAPile: isTurnChooseAPile(game?.turnStatus),
    isThrowOrReplace: isTurnThrowOrReplace(game?.turnStatus),
    isTurnACard: isTurnTurnACard(game?.turnStatus),
    isReplaceACard: isTurnReplaceACard(game?.turnStatus),
  }
  //#endregion

  //#region last turn status
  const lastTurnStatus = {
    isPickFromDrawPile: isLastTurnPickFromDrawPile(game?.lastTurnStatus),
    isPickFromDiscardPile: isLastTurnPickFromDiscardPile(game?.lastTurnStatus),
    isThrow: isLastTurnThrow(game?.lastTurnStatus),
    isReplace: isLastTurnReplace(game?.lastTurnStatus),
    isTurn: isLastTurnTurn(game?.lastTurnStatus),
  }
  //#endregion

  const providerValue = useMemo(
    () => ({
      game: game as GameToJson,
      player: player as PlayerToJson,
      opponents,
      nbConnectedPlayers,
      actions,
      roundPhase,
      gameStatus,
      turnStatus,
      lastTurnStatus,
    }),
    [
      game,
      opponents,
      player,
      roundPhase,
      gameStatus,
      turnStatus,
      lastTurnStatus,
      nbConnectedPlayers,
    ],
  )

  if (!game || !player) return null

  return (
    <GameContext.Provider value={providerValue}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
export default GameProvider
