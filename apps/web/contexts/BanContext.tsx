import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"
import { useRouter } from "@/i18n/routing"
import { BanError } from "@skymo/error"
import { useTranslations } from "next-intl"
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react"
import { toast } from "sonner"

type BanContext = {
  banPlayer: (targetId: string) => void
}

const BanContext = createContext<BanContext | undefined>(undefined)

export const BanProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket()
  const { player } = useGame()
  const router = useRouter()
  const t = useTranslations("contexts.BanContext")

  useEffect(() => {
    if (!socket) return

    initBanListeners()

    return destroyBanListeners
  }, [socket])

  //#region listeners
  const onPlayerBanned = (playerId: string, playerName: string) => {
    // If the current player is banned, redirect to home
    if (playerId === player.id) {
      toast.error(t("you-were-banned.title"), {
        description: t("you-were-banned.description"),
      })
      router.replace("/")
    } else {
      toast.info(t("player-banned.title", { playerName }), {
        description: t("player-banned.description", { playerName }),
      })
    }
  }

  const onBanError = (errorCode: BanError) => {
    toast.error(t(`${errorCode}.title`), {
      description: t(`${errorCode}.description`),
    })
  }

  const initBanListeners = () => {
    socket!.on("ban:player-banned", onPlayerBanned)
    socket!.on("ban:error", onBanError)
  }

  const destroyBanListeners = () => {
    socket!.off("ban:player-banned", onPlayerBanned)
    socket!.off("ban:error", onBanError)
  }
  //#endregion

  //#region actions
  const banPlayer = (targetId: string) => {
    if (!socket) return
    socket.emit("ban:player", { targetId })
  }
  //#endregion

  const providerValue = useMemo(() => ({ banPlayer }), [])

  return (
    <BanContext.Provider value={providerValue}>{children}</BanContext.Provider>
  )
}

export const useBan = () => {
  const context = useContext(BanContext)
  if (context === undefined) {
    throw new Error("useBan must be used within a BanProvider")
  }
  return context
}
