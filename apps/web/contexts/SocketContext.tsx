"use client"

import { useUser } from "@/contexts/UserContext"
import { usePathname, useRouter } from "@/i18n/routing"
import {
  addReconnectionDateToLastGame,
  clearLastGame,
} from "@/utils/reconnection"
import {
  Constants as CoreConstants,
  CreatePlayer,
  GameStatus,
} from "@skyjo/core"
import { Constants as ErrorConstants } from "@skyjo/error"
import {
  ClientToServerEvents,
  ErrorJoinMessage,
  ErrorReconnectMessage,
  ErrorRecoverMessage,
  ServerToClientEvents,
} from "@skyjo/shared/types"
import { LastGame } from "@skyjo/shared/validations"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { WifiIcon, WifiOffIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Socket, io } from "socket.io-client"
import customParser from "socket.io-msgpack-parser"
import { toast } from "sonner"

dayjs.extend(utc)

export type SkyjoSocket = Socket<ServerToClientEvents, ClientToServerEvents>

type SocketContext = {
  socket: SkyjoSocket | null
  createGame: (player: CreatePlayer, isPrivate: boolean) => void
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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setPlayerId } = useUser()

  const [socket, setSocket] = useState<SkyjoSocket | null>(null)

  //#region error descriptions
  const joinErrorDescription: Record<ErrorJoinMessage, string> = {
    [ErrorConstants.ERROR.GAME_NOT_FOUND]: tSocketError(
      "game-not-found.description",
    ),
    [ErrorConstants.ERROR.GAME_ALREADY_STARTED]: tSocketError(
      "game-already-started.description",
    ),
    [ErrorConstants.ERROR.GAME_IS_FULL]: tSocketError(
      "game-is-full.description",
    ),
  }

  const reconnectErrorDescription: Record<ErrorReconnectMessage, string> = {
    [ErrorConstants.ERROR.CANNOT_RECONNECT]: tSocketError(
      "cannot-reconnect.description",
    ),
  }
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
    initGameListeners()

    return () => destroyGameListeners()
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

  const onConnectionLost = (reason: Socket.DisconnectReason) => {
    if (reason === "ping timeout") addReconnectionDateToLastGame()

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

  const initGameListeners = () => {
    socket!.on("connect", onConnect)
    socket!.on("disconnect", onConnectionLost)
    socket!.on("connect_error", onConnectionError)
    socket!.on("error:recover", onRecoverError)
  }
  const destroyGameListeners = () => {
    socket!.off("connect", onConnect)
    socket!.off("disconnect", onConnectionLost)
    socket!.off("connect_error", onConnectionError)
    socket!.off("error:recover", onRecoverError)
  }
  //#endregion

  const createGame = (player: CreatePlayer, isPrivate: boolean) => {
    const socket = getSocket()

    try {
      socket.once("error:join", onJoinGameError)
      socket.once("game:join", onJoinGameSuccess)

      socket.timeout(10000).emit("create", player, isPrivate)
    } catch {
      toast.error(tSocketError("timeout.description"), {
        duration: 5000,
      })
    }
  }

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

  const onJoinGameSuccess = (
    code: string,
    status: GameStatus,
    playerId: string,
  ) => {
    localStorage.setItem(
      "lastGame",
      JSON.stringify({
        gameCode: code,
        playerId,
      }),
    )

    setPlayerId(playerId)

    if (status === CoreConstants.GAME_STATUS.LOBBY)
      router.replace(`/game/${code}/lobby`)
    else router.replace(`/game/${code}`)
  }

  const onJoinGameError = (message: ErrorJoinMessage) => {
    toast.error(joinErrorDescription[message], {
      duration: 5000,
    })

    let route = pathname
    if (searchParams.has("gameCode")) {
      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.delete("gameCode")
      route += `?${nextSearchParams}`
    }

    router.replace(route)
  }
  //#endregion

  //#region reconnect
  const reconnectGame = async (
    lastGame: LastGame,
    errorCallback: () => void,
  ) => {
    const socket = getSocket()

    delete lastGame?.maxDateToReconnect

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

  const onReconnectError = (message: ErrorReconnectMessage) => {
    clearLastGame()

    toast.error(reconnectErrorDescription[message], {
      duration: 5000,
    })

    router.replace("/")
  }
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
