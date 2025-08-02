"use client"

import { useTranslations } from "next-intl"
import { useEffect } from "react"
import { GameCard } from "@/components/Card/GameCard"
import { useSocket } from "@/contexts/SocketContext"
import { useRouter } from "@/i18n/routing"
import { getLastGameCookie } from "@/utils/gameCookie"

const generateRandomCard = () => ({
  id: "loading-card",
  value: Math.floor(Math.random() * 14) - 2,
  isVisible: true,
})

export default function ReconnectPage() {
  const router = useRouter()
  const { reconnectGame } = useSocket()
  const t = useTranslations("pages.Reconnect")

  useEffect(() => {
    const lastGame = getLastGameCookie()

    if (!lastGame) {
      console.log("No last game found")
      router.replace("/")
      return
    }

    const errorCallback = () => {
      // If reconnection fails, redirect to home
      console.log("Reconnection failed")
      router.replace("/")
    }

    // Reconnect to Socket.IO
    reconnectGame(lastGame, errorCallback)
  }, [reconnectGame, router])

  return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-6">
        <GameCard card={generateRandomCard()} size="normal" disabled={true} />
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">{t("title")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("description")}</p>
        </div>
      </div>
    </div>
  )
}
