"use client"

import { GameCard } from "@/components/Card/GameCard"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSocket } from "@/contexts/SocketContext"
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

const initialCard: CardToJson = {
  id: "loading-cards",
  value: 0,
  isVisible: true,
}

const CreateGameClientLogic = () => {
  const { getPlayer } = usePlayer()
  const { createGame } = useSocket()
  const searchParams = useSearchParams()
  const t = useTranslations("pages.Create")
  const [loading, setLoading] = useState(false)

  const [card, setCard] = useState<CardToJson>(initialCard)

  const privateQueryParam = searchParams.get("private")

  const isPrivate = privateQueryParam === "true"

  useEffect(() => {
    setCard(generateRandomCard(true))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCard((prev) => generateRandomCard(!prev.isVisible))
    }, 1000)

    const handleCreateGame = async () => {
      const player = getPlayer()

      if (!loading) {
        createGame(player, isPrivate)
        setLoading(true)
      }
    }

    handleCreateGame()

    return () => clearInterval(interval)
  }, [createGame, getPlayer, isPrivate, loading])

  return (
    <div className="h-svh w-full flex flex-col gap-2 items-center justify-center">
      <GameCard key={card.id} card={card} size="normal" disabled={true} />

      <p>{t("loading-text")}</p>
    </div>
  )
}

export { CreateGameClientLogic }
