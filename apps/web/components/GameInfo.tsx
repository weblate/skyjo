"use client"

import { AnimatePresence, m } from "motion/react"
import { useTranslations } from "next-intl"
import { useGame } from "@/contexts/GameContext"
import { hasRevealedCardCount, isCurrentUserTurn } from "@/lib/game"

const GameInfo = () => {
  const { game, player, opponents, roundPhase, gameStatus, turnStatus } =
    useGame()
  const t = useTranslations("utils.skymo")

  const getGameInfo = () => {
    if (!player || !game) return t("waiting")

    if (gameStatus.isPlaying && roundPhase.isRevealCards) {
      if (hasRevealedCardCount(player, game.settings.initialTurnedCount)) {
        return t("waiting-opponents-to-turn-cards", {
          nbOpponents: opponents.flat().length,
          number: game.settings.initialTurnedCount,
        })
      } else {
        return t("turn-cards", {
          number: game.settings.initialTurnedCount,
        })
      }
    }

    if (turnStatus.isChooseAPile) return t("turn.chooseAPile")
    if (turnStatus.isThrowOrReplace) return t("turn.throwOrReplace")
    if (turnStatus.isTurnACard) return t("turn.turnACard")
    if (turnStatus.isReplaceACard) return t("turn.replaceACard")
  }

  const isPlayerTurn = isCurrentUserTurn(game, player)

  const gameInProgress =
    roundPhase.isRevealCards || roundPhase.isMain || roundPhase.isLastLap

  const showGameInfo = gameInProgress && isPlayerTurn
  return (
    <div className="absolute -top-8 mdh:-top-11 text-center animate-scale flex flex-col items-center">
      <AnimatePresence>
        {roundPhase.isLastLap && (
          <m.p
            key="game-info-last-turn"
            initial={{
              scale: 0,
            }}
            animate={{
              scale: 1,
              transition: {
                duration: 0.3,
                ease: "easeInOut",
              },
            }}
            exit={{
              scale: 0,
              transition: {
                duration: 0.5,
                ease: "easeInOut",
              },
            }}
            className="text-sm text-black dark:text-dark-font"
          >
            {t("last-turn")}
          </m.p>
        )}
        {showGameInfo && (
          <m.p
            key="game-info-text"
            className="text-nowrap text-sm text-black dark:text-dark-font"
            initial={{
              scale: 0,
            }}
            animate={{
              scale: 1,
              transition: {
                duration: 0.3,
                ease: "easeInOut",
              },
            }}
            exit={{
              scale: 0,
              transition: {
                duration: 0.5,
                ease: "easeInOut",
              },
            }}
          >
            {getGameInfo()}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GameInfo
