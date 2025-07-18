"use client"

import { useQuery } from "@tanstack/react-query"
import { Howler } from "howler"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
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
import { getGameStatus } from "@/utils/gameStatus"
import { clearLastGame, getLastGame } from "@/utils/reconnection"

const ReconnectionModal = () => {
  const { reconnectGame } = useSocket()
  const t = useTranslations("components.ReconnectionModal")

  const [loading, setLoading] = useState<boolean>(false)
  const [showReconnectionModal, setShowReconnectionModal] =
    useState<boolean>(false)

  const lastGame = getLastGame()

  const { data: game, isFetched } = useQuery({
    queryKey: ["gameStatus", lastGame?.gameCode],
    queryFn: () => getGameStatus(lastGame!.gameCode),
    enabled: !!lastGame,
    retry: false,
  })

  useEffect(() => {
    if (!isFetched) return

    if (!game) {
      clearLastGame()
      return
    }

    setShowReconnectionModal(game.connectedPlayersCount > 0)
  }, [isFetched, game])

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
    localStorage.removeItem("lastGame")
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
          <Button onClick={handleModalReconnect} loading={loading}>
            {t("reconnect-button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReconnectionModal
