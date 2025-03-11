"use client"

import { useChat } from "@/contexts/ChatContext"
import { useSocket } from "@/contexts/SocketContext"
import { useUser } from "@/contexts/UserContext"
import { useAfkKickToasts } from "@/hooks/useAfkKickToasts"
import { useRouter } from "@/i18n/routing"
import { getCurrentUser, getOpponents, isAdmin } from "@/lib/skyjo"
import { Opponents } from "@/types/opponents"
import {
  addReconnectionDateToLastGame,
  clearLastGame,
} from "@/utils/reconnection"
import {
  Constants as CoreConstants,
  PlayPickCard,
  SkyjoPlayerToJson,
  SkyjoToJson,
} from "@skyjo/core"
import { UpdateGameSettings, UpdateMaxPlayers } from "@skyjo/shared/validations"
import {
  type SkyjoOperation,
  applyStateOperations,
} from "@skyjo/state-operations"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Socket } from "socket.io-client"
import { toast } from "sonner"

dayjs.extend(utc)

type SkyjoContext = {
  game: SkyjoToJson
  player: SkyjoPlayerToJson
  opponents: Opponents
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
    leave: () => void
  }
}

const SkyjoContext = createContext<SkyjoContext | undefined>(undefined)

interface SkyjoProviderProps extends PropsWithChildren {
  gameCode: string
}

const SkyjoProvider = ({ children, gameCode }: SkyjoProviderProps) => {
  const { socket } = useSocket()
  const { playerId } = useUser()
  const { sendMessage, setChat } = useChat()
  const router = useRouter()
  const { showAfkWarning, showAfkKick, showPlayerAfkKick } = useAfkKickToasts()

  const [game, setGame] = useState<SkyjoToJson>()

  const player = getCurrentUser(game?.players, playerId)
  const opponents = getOpponents(game?.players, playerId)

  const admin = isAdmin(game, player?.id)
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

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!game?.status) return

      const inGame = game?.status === CoreConstants.GAME_STATUS.PLAYING
      if (inGame) {
        addReconnectionDateToLastGame()
        event.preventDefault()
      } else {
        clearLastGame()
      }
    }

    window.addEventListener("beforeunload", onUnload)

    socket!.on("disconnect", onDisconnect)

    return () => {
      socket!.off("disconnect", onDisconnect)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [game?.status])

  //#endregion

  //#region listeners
  //#region game
  const onGameReceive = (game: SkyjoToJson) => {
    setGame(game)
  }

  const onGameUpdate = (operations: SkyjoOperation) => {
    console.log("onGameUpdate", operations)
    setGame((prev) => {
      if (!prev) return prev
      const prevState = structuredClone(prev)
      const newState = applyStateOperations(prevState, operations)
      return newState
    })
  }

  const onGameFix = (operations: SkyjoOperation[]) => {
    console.log("onGameFix", operations)
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
    setChat([])
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
    if (!admin) return

    socket!.emit("game:update-max-players", maxPlayers)
  }

  const updateSingleSettings = <T extends keyof UpdateGameSettings>(
    key: T,
    value: UpdateGameSettings[T],
  ) => {
    if (!admin) return

    socket!.emit("game:update-settings", {
      [key]: value,
    })
  }

  const toggleSettingsValidation = () => {
    if (!admin) return

    socket!.emit("game:settings:toggle-validation")
  }

  const updateSettings = (settings: UpdateGameSettings) => {
    if (!admin) return

    socket!.emit("game:update-settings", settings)
  }

  const resetSettings = () => {
    if (!admin) return

    socket!.emit("game:reset-settings")
  }

  const startGame = () => {
    if (!admin) return

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

  const leave = () => {
    toast.dismiss()
    socket!.emit("leave")
  }

  const actions = {
    sendMessage,
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

  const providerValue = useMemo(
    () => ({
      game: game as SkyjoToJson,
      player: player as SkyjoPlayerToJson,
      opponents,
      actions,
    }),
    [game, opponents, player],
  )

  if (!game || !player) return null

  return (
    <SkyjoContext.Provider value={providerValue}>
      {children}
    </SkyjoContext.Provider>
  )
}

export const useSkyjo = () => {
  const context = useContext(SkyjoContext)
  if (context === undefined) {
    throw new Error("useSkyjo must be used within a SkyjoProvider")
  }
  return context
}
export default SkyjoProvider
