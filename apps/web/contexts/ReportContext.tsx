import { useTranslations } from "next-intl"
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import ReportDialog from "@/components/ReportDialog"
import { useChat } from "@/contexts/ChatContext"
import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"
import { useRouter } from "@/i18n/routing"

interface Report {
  playerId: string
  messageId?: string
}

interface ReportContext {
  reportPlayer: (playerId: string, messageId?: string) => void
}

const ReportContext = createContext<ReportContext | undefined>(undefined)

export const ReportProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket()
  const { chat } = useChat()
  const { game, player } = useGame()
  const router = useRouter()
  const t = useTranslations("contexts.ReportContext")

  const [report, setReport] = useState<Report | undefined>(undefined)

  //#region listeners
  const onReport = (playerToKickId: string, playerToKickName: string) => {
    if (playerToKickId === player.id) {
      toast(t("report-against-you.title"), {
        description: t("report-against-you.description"),
      })
      router.replace("/")
    } else {
      toast(t("report.title", { playerName: playerToKickName }))
    }
  }

  const initKickVoteListeners = () => {
    socket!.on("kick:report", onReport)
  }

  const destroyKickVoteListeners = () => {
    socket!.off("kick:report", onReport)
  }

  useEffect(() => {
    if (!game || !socket) return

    initKickVoteListeners()

    return destroyKickVoteListeners
  }, [socket, game])
  //#endregion listeners

  //#region actions
  const reportPlayer = (playerId: string, messageId?: string) => {
    setReport({ playerId, messageId })
  }
  //#endregion actions

  const providerValue = useMemo(
    () => ({
      reportPlayer,
    }),
    [],
  )

  return (
    <ReportContext.Provider value={providerValue}>
      <ReportDialog
        open={!!report}
        report={report}
        messages={chat}
        onOpenChange={() => setReport(undefined)}
      />
      {children}
    </ReportContext.Provider>
  )
}

export const useReport = () => {
  const context = useContext(ReportContext)
  if (context === undefined) {
    throw new Error("useReport must be used within a ReportProvider")
  }
  return context
}
