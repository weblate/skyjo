"use client"

import type { LastGame } from "@skymo/shared/validations"
import { Howler } from "howler"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSocket } from "@/contexts/SocketContext"
import { clearLastGameCookie } from "@/utils/gameCookie"

interface ReconnectPrivateGameModalProps {
  lastGame: LastGame
}

const ReconnectPrivateGameModal = ({
  lastGame,
}: ReconnectPrivateGameModalProps) => {
  const { reconnectGame } = useSocket()
  const t = useTranslations("components.ReconnectionModal")

  const [loading, setLoading] = useState<boolean>(false)
  const [showReconnectionModal, setShowReconnectionModal] =
    useState<boolean>(true)

  const errorCallback = () => setLoading(false)

  const handleReconnection = async () => {
    if (!lastGame) {
      setLoading(false)
      return
    }

    reconnectGame(lastGame, errorCallback)
  }

  const handleModalReconnect = () => {
    setLoading(true)
    Howler.ctx.resume()
    handleReconnection()
  }

  const handleModalDismiss = () => {
    clearLastGameCookie()
    setShowReconnectionModal(false)
    setLoading(false)
  }

  return (
    <Dialog open={showReconnectionModal}>
      <DialogContent className="sm:max-w-md" allowClose={false}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={handleModalDismiss} color="white" loading={loading}>
            {t("dismiss-button")}
          </Button>
          <Button onClick={handleModalReconnect} loading={loading} autoFocus>
            {t("reconnect-button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReconnectPrivateGameModal
