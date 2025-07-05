"use client"

import { useEffect } from "react"
import { useLocalStorage } from "react-use"
import DiscardPile from "@/components/DiscardPile"
import DrawPile from "@/components/DrawPile"
import EndRoundDialog from "@/components/EndRoundDialog"
import GameInfo from "@/components/GameInfo"
import { GameRules } from "@/components/GameRules"
import MenuDropdown from "@/components/MenuDropdown"
import OpponentBoard from "@/components/OpponentBoard"
import OpponentsMobileView from "@/components/OpponentsMobileView"
import PlayerBoard from "@/components/PlayerBoard"
import Scoreboard from "@/components/Scoreboard"
import { useGame } from "@/contexts/GameContext"
import { useRules } from "@/contexts/RulesContext"
import { useRouter } from "@/i18n/routing"
import { isCurrentUserTurn } from "@/lib/game"
import { getRedirectionUrl } from "@/lib/utils"

const GamePage = () => {
  const { game, player, opponents, roundPhase } = useGame()
  const { openRules, isRulesOpen } = useRules()
  const router = useRouter()
  const [firstGame, setFirstGame] = useLocalStorage<boolean>("firstGame")

  const isPlayerTurn = isCurrentUserTurn(game, player)
  const isFirstPlayerGame = firstGame ?? true

  useEffect(() => {
    if (isFirstPlayerGame) openRules()
  }, [isFirstPlayerGame])

  useEffect(() => {
    if (!isRulesOpen && isFirstPlayerGame) setFirstGame(false)
  }, [isRulesOpen])

  useEffect(() => {
    setTimeout(() => {
      router.replace(getRedirectionUrl(game.code, game.status))
    }, 2000)
  }, [game.status])

  return (
    <div className="h-full w-full !p-4 !md:p-6 flex flex-col gap-2">
      <div className="flex flex-1 flex-row items-start">
        {/* mobile */}
        <OpponentsMobileView />
        {/* desktop */}
        <div className="hidden lg:block w-10"></div>
        <div className="hidden lg:flex grow flex-row justify-evenly">
          {opponents[1].map((opponent) => (
            <OpponentBoard
              opponent={opponent}
              key={opponent.id}
              isPlayerTurn={isCurrentUserTurn(game, opponent)}
            />
          ))}
        </div>
        <div className="flex flex-row justify-end">
          <div className="flex flex-col gap-4 items-center justify-start">
            <MenuDropdown variant="game" />
            <Scoreboard />
            <GameRules />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 flex-1 items-center">
        <div className="hidden lg:flex flex-col items-start justify-center">
          {opponents[0].map((opponent) => (
            <OpponentBoard
              opponent={opponent}
              key={opponent.id}
              isPlayerTurn={isCurrentUserTurn(game, opponent)}
            />
          ))}
        </div>
        <div className="col-start-2 flex flex-col justify-center items-center gap-4">
          <div className="relative flex flex-row items-center justify-center gap-10 h-full max-h-20 w-fit">
            <GameInfo />
            <DrawPile
              isPlayerTurn={isPlayerTurn && !roundPhase.isRevealCards}
            />
            <DiscardPile
              isPlayerTurn={isPlayerTurn && !roundPhase.isRevealCards}
            />
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-end justify-center">
          {opponents[2].map((opponent) => (
            <OpponentBoard
              opponent={opponent}
              key={opponent.id}
              isPlayerTurn={isCurrentUserTurn(game, opponent)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-row items-end justify-center">
        {player && <PlayerBoard player={player} isPlayerTurn={isPlayerTurn} />}
      </div>
      <EndRoundDialog />
    </div>
  )
}

export default GamePage
