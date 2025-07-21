"use client"

import type { Error as ThrownError } from "@skymo/error"
import { useTranslations } from "next-intl"
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from "react"
import { toast } from "sonner"
import { useSocket } from "@/contexts/SocketContext"

interface HostTransferContext {
  transferHost: (newHostId: string) => void
}

const HostTransferContext = createContext<HostTransferContext | undefined>(
  undefined,
)

export const HostTransferProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket()
  const t = useTranslations("contexts.HostTransferContext")

  useEffect(() => {
    if (!socket) return

    const onHostTransferError = (errorCode: ThrownError) => {
      if (errorCode === "not-allowed") {
        toast.error(t("not-allowed.title"), {
          description: t("not-allowed.description"),
        })
      } else if (errorCode === "player-not-found") {
        toast.error(t("player-not-found.title"), {
          description: t("player-not-found.description"),
        })
      } else if (errorCode === "player-not-connected") {
        toast.error(t("player-not-connected.title"), {
          description: t("player-not-connected.description"),
        })
      } else {
        toast.error(t("unexpected-error.title"), {
          description: t("unexpected-error.description"),
        })
      }
    }

    socket.on("host:transfer-error", onHostTransferError)

    return () => {
      socket.off("host:transfer-error", onHostTransferError)
    }
  }, [socket, t])

  //#region actions
  const transferHost = (newHostId: string) => {
    if (!socket) return
    socket.emit("host:transfer", { newHostId })
  }
  //#endregion

  const providerValue = useMemo(() => ({ transferHost }), [])

  return (
    <HostTransferContext.Provider value={providerValue}>
      {children}
    </HostTransferContext.Provider>
  )
}

export const useHostTransfer = () => {
  const context = useContext(HostTransferContext)
  if (context === undefined) {
    throw new Error(
      "useHostTransfer must be used within a HostTransferProvider",
    )
  }
  return context
}
