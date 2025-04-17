"use client"

import { GameCard } from "@/components/Card/GameCard"
import { useSocket } from "@/contexts/SocketContext"
import { useUser } from "@/contexts/UserContext"
import { CardToJson } from "@skymo/core"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const generateRandomCard = (isVisible: boolean): CardToJson => {
  const value = isVisible ? Math.floor(Math.random() * 14) - 2 : undefined

  return {
    id: "loading-cards",
    value,
    isVisible,
  }
}

const CreateGameClientLogic = () => {
  const { getUser } = useUser()
  const { socket, createGame } = useSocket()
  const searchParams = useSearchParams()
  const t = useTranslations("pages.Create")
  const [loading, setLoading] = useState(false)

  const [card, setCard] = useState<CardToJson>(generateRandomCard(true))

  const privateQueryParam = searchParams.get("private")

  const isPrivate = privateQueryParam === "true"

  useEffect(() => {
    // loading card animation
    const interval = setInterval(() => {
      setCard((prev) => generateRandomCard(!prev.isVisible))
    }, 1000)

    const player = getUser()

    if (!loading) {
      createGame(player, isPrivate)
      setLoading(true)
    }

    return () => clearInterval(interval)
  }, [socket, isPrivate])

  return (
    <div className="h-svh w-full flex flex-col gap-2 items-center justify-center">
      <GameCard key={card.id} card={card} size="normal" disabled={true} />

      <p>{t("loading-text")}</p>
    </div>
  )
}

export { CreateGameClientLogic }
