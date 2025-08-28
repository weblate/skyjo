"use client"

import {
  Constants as CoreConstants,
  CreatePlayer,
  GameStatus,
} from "@skymo/core"
import { Constants as ErrorConstants } from "@skymo/error"
import {
  ClientToServerEvents,
  ErrorCreateMessage,
  ErrorJoinMessage,
  ErrorReconnectMessage,
  ErrorRecoverMessage,
  ServerToClientEvents,
} from "@skymo/shared/types"
import { LastGame } from "@skymo/shared/validations"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { WifiIcon, WifiOffIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { io, Socket } from "socket.io-client"
import customParser from "socket.io-msgpack-parser"
import { toast } from "sonner"
import { usePlayer } from "@/contexts/PlayerContext"
import { useRouter } from "@/i18n/routing"
import { clearLastGameCookie, setLastGameCookie } from "@/utils/gameCookie"

dayjs.extend(utc)

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface SocketContext {
  socket: GameSocket | null
  createGame: (
    player: CreatePlayer,
    isPrivate: boolean,
    onError: () => void,
  ) => void
  joinGame: (
    player: CreatePlayer,
    gameCode: string,
    onError: () => void,
  ) => void
  reconnectGame: (lastGame: LastGame, errorCallback: () => void) => void
}
const SocketContext = createContext<SocketContext | undefined>(undefined)

const SocketProvider = ({ children }: PropsWithChildren) => {
  const t = useTranslations("contexts.SocketContext")
  const tSocketError = useTranslations("utils.socket.error")
  const router = useRouter()
  const { setPlayerId } = usePlayer()

  const [socket, setSocket] = useState<GameSocket | null>(null)

  //#region error descriptions
  const joinErrorDescription = useMemo(
    () => ({
      [ErrorConstants.ERROR.GAME_NOT_FOUND]: tSocketError(
        "game-not-found.description",
      ),
      [ErrorConstants.ERROR.GAME_ALREADY_STARTED]: tSocketError(
        "game-already-started.description",
      ),
      [ErrorConstants.ERROR.GAME_IS_FULL]: tSocketError(
        "game-is-full.description",
      ),
      [ErrorConstants.ERROR.PLAYER_BANNED]: tSocketError(
        "player-banned.description",
      ),
      [ErrorConstants.ERROR.PLAYER_ALREADY_CONNECTED]: tSocketError(
        "player-already-connected.description",
      ),
    }),
    [tSocketError],
  )

  const reconnectErrorDescription = useMemo(
    () => ({
      [ErrorConstants.ERROR.CANNOT_RECONNECT]: tSocketError(
        "cannot-reconnect.description",
      ),
    }),
    [tSocketError],
  )
  //#endregion

  const getSocket = () => {
    if (socket !== null) return socket

    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL is not set")
    }

    console.log("Connecting to socket", process.env.NEXT_PUBLIC_API_URL)
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL, {
      autoConnect: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 2000,
      reconnectionAttempts: 10,
      timeout: 20000,
      withCredentials: true,
      parser: customParser,
    })

    setSocket(newSocket)
    return newSocket
  }

  useEffect(() => {
    return () => {
      socket?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socket === null) return
    initCommonListeners()

    return () => destroyCommonListeners()
  }, [socket])

  //#region listeners
  const onConnect = async () => {
    if (socket!.recovered) {
      toast.success(t("reconnection"), {
        duration: 2000,
        icon: <WifiIcon className="w-5 h-5 text-emerald-600" />,
        id: "socket-reconnection",
      })
    } else console.log("Socket connected")
  }

  const onConnectionLost = () => {
    if (socket?.active) {
      toast.warning(t("connection-lost"), {
        duration: 3000,
        icon: <WifiOffIcon className="w-5 h-5" />,
        id: "socket-connection-lost",
      })
    }
  }

  const onConnectionError = (err: unknown) => {
    console.error("Socket error", err)
  }

  const onRecoverError = (message: ErrorRecoverMessage) => {
    console.log("onRecoverError", message)
    if (message === "game-not-found") {
      router.replace("/")
      toast.error(t("recover-error.game-not-found.title"), {
        description: t("recover-error.game-not-found.description"),
        duration: 5000,
      })
    }
  }

  const onRateLimitError = () => {
    toast.error(tSocketError("rate-limit.description"), {
      duration: 5000,
    })
  }

  const initCommonListeners = () => {
    socket!.on("connect", onConnect)
    socket!.on("disconnect", onConnectionLost)
    socket!.on("connect_error", onConnectionError)
    socket!.on("error:recover", onRecoverError)
    socket!.on("error:rate-limit", onRateLimitError)
  }
  const destroyCommonListeners = () => {
    socket!.off("connect", onConnect)
    socket!.off("disconnect", onConnectionLost)
    socket!.off("connect_error", onConnectionError)
    socket!.off("error:recover", onRecoverError)
    socket!.off("error:rate-limit", onRateLimitError)
  }
  //#endregion

  const createGame = (
    player: CreatePlayer,
    isPrivate: boolean,
    onError: () => void,
  ) => {
    const socket = getSocket()

    socket.once("game:join", onJoinGameSuccess)
    socket.once("error:create", onCreateGameError)
    socket.once("error:join", (message) => {
      onJoinGameError(message)
      onError()
    })

    try {
      socket.timeout(10000).emit("create", player, isPrivate)
    } catch {
      toast.error(tSocketError("timeout.description"), {
        duration: 5000,
      })
      onError()
    }
  }

  const onCreateGameError = useCallback(
    (message: ErrorCreateMessage) => {
      console.log("onCreateGameError", message)
      if (message === ErrorConstants.ERROR.PLAYER_PENALTY_BANNED) {
        router.replace("/")
      }
    },
    [router],
  )

  //#region join game
  const joinGame = (
    player: CreatePlayer,
    gameCode: string,
    onError: () => void,
  ) => {
    const socket = getSocket()

    socket.once("game:join", onJoinGameSuccess)
    socket.once("error:join", (message) => {
      onJoinGameError(message)
      onError()
    })

    try {
      socket.timeout(10000).emit("join", { gameCode, player })
    } catch {
      toast.error(tSocketError("timeout.description"), {
        duration: 5000,
      })
      onError()
    }
  }

  const onJoinGameSuccess = useCallback(
    (
      gameCode: string,
      status: GameStatus,
      playerId: string,
      sessionId: string,
    ) => {
      setLastGameCookie({
        gameCode,
        playerId,
        sessionId,
      })

      setPlayerId(playerId)

      switch (status) {
        case CoreConstants.GAME_STATUS.LOBBY:
          router.replace(`/game/${gameCode}/lobby`)
          break
        case CoreConstants.GAME_STATUS.PLAYING:
          router.replace(`/game/${gameCode}`)
          break
        case CoreConstants.GAME_STATUS.FINISHED:
        case CoreConstants.GAME_STATUS.STOPPED:
        default:
          router.replace(`/game/${gameCode}/results`)
          break
      }
    },
    [setPlayerId, router],
  )

  const onJoinGameError = useCallback(
    (message: ErrorJoinMessage) => {
      console.log("onJoinGameError", message)

      if (message === ErrorConstants.ERROR.PLAYER_PENALTY_BANNED) {
        router.replace("/")
        return
      }

      // Show toast for all other errors including regular player bans
      toast.error(joinErrorDescription[message], {
        duration: 5000,
      })
    },
    [joinErrorDescription, router],
  )
  //#endregion

  //#region reconnect
  const reconnectGame = async (
    lastGame: LastGame,
    errorCallback: () => void,
  ) => {
    const socket = getSocket()

    socket.once("error:reconnect", onReconnectError)
    socket.once("error:join", onJoinGameError)
    socket.once("game:join", onJoinGameSuccess)

    try {
      socket.timeout(10000).emit("reconnect", lastGame)
    } catch {
      toast.error(tSocketError("timeout.description"), {
        duration: 5000,
      })
      errorCallback()
    }
  }

  const onReconnectError = useCallback(
    (message: ErrorReconnectMessage) => {
      clearLastGameCookie()

      toast.error(reconnectErrorDescription[message], {
        duration: 5000,
      })

      router.replace("/")
    },
    [reconnectErrorDescription, router],
  )
  //#endregion

  const value = useMemo(
    () => ({
      socket,
      createGame,
      joinGame,
      reconnectGame,
    }),
    [socket, socket?.recovered],
  )

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}

export default SocketProvider
