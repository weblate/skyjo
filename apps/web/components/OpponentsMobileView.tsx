import { Card } from "@/components/Card/Card"
import OpponentBoard from "@/components/OpponentBoard"
import { UserAvatar } from "@/components/UserAvatar"
import { useGame } from "@/contexts/GameContext"
import { useSettings } from "@/contexts/SettingsContext"
import {
  getCurrentScore,
  getCurrentWhoHasToPlay,
  getNextPlayerIndex,
  isCurrentUserTurn,
} from "@/lib/game"
import { cn } from "@/lib/utils"
import { PlayerToJson } from "@skymo/core"
import { AnimatePresence, m } from "motion/react"
import { useEffect, useState } from "react"

const OpponentsMobileView = () => {
  const { opponents, game, player, gameStatus } = useGame()
  const {
    settings: { switchToPlayerWhoIsPlaying },
  } = useSettings()
  const flattenOpponents = opponents.flat()

  const [selectedOpponentIndex, setSelectedOpponentIndex] = useState(
    getNextPlayerIndex(game, player),
  )

  useEffect(() => {
    if (!switchToPlayerWhoIsPlaying) return

    const getCurrentPlayer = () => {
      const currentWhoHasToPlay = getCurrentWhoHasToPlay(game)

      const currentPlayerIndex = flattenOpponents.findIndex(
        (opponent) => opponent.id === currentWhoHasToPlay?.id,
      )

      return currentPlayerIndex
    }
    const setNewSelectedOpponentIndex = () => {
      const newSelectedOpponentIndex = isCurrentUserTurn(game, player)
        ? getNextPlayerIndex(game, player)
        : getCurrentPlayer()

      if (newSelectedOpponentIndex === -1) return

      setTimeout(() => {
        setSelectedOpponentIndex(newSelectedOpponentIndex)
      }, 1500)
    }

    setNewSelectedOpponentIndex()
  }, [switchToPlayerWhoIsPlaying, game.turn, game.players])

  useEffect(() => {
    if (gameStatus.isPlaying) {
      const nextPlayerIndex = getNextPlayerIndex(game, player)
      if (nextPlayerIndex !== -1) setSelectedOpponentIndex(nextPlayerIndex)
    }
  }, [gameStatus.isPlaying])

  if (flattenOpponents.length === 0) return null

  const selectedOpponent = flattenOpponents[selectedOpponentIndex]

  return (
    <AnimatePresence>
      <div className="flex lg:hidden flex-row grow">
        <OpponentList
          opponents={flattenOpponents}
          selectedOpponentIndex={selectedOpponentIndex}
          setSelectedOpponentIndex={setSelectedOpponentIndex}
        />
        <div className="w-10" />
        <div className="flex grow justify-center items-start">
          {selectedOpponent && (
            <m.div
              key={selectedOpponent.id}
              initial={{ opacity: 0, scale: 0.8, x: -50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ display: "none", transition: { duration: 0 } }}
            >
              <OpponentBoard
                opponent={selectedOpponent}
                isPlayerTurn={isCurrentUserTurn(game, selectedOpponent)}
                className="w-fit h-fit snap-center"
              />
            </m.div>
          )}
        </div>
      </div>
    </AnimatePresence>
  )
}

type OpponentListProps = {
  opponents: PlayerToJson[]
  selectedOpponentIndex: number
  setSelectedOpponentIndex: (index: number) => void
}
const OpponentList = ({
  opponents,
  selectedOpponentIndex,
  setSelectedOpponentIndex,
}: OpponentListProps) => {
  const { game } = useGame()

  return (
    <div className="absolute flex flex-col w-20 gap-4 h-[calc(100svh-2rem)] pt-1 overflow-y-auto">
      {opponents.length > 1 &&
        opponents.map((opponent, index) => {
          const isSelected = index === selectedOpponentIndex
          const isPlayerWhoHasToPlay = isCurrentUserTurn(game, opponents[index])

          return (
            <OpponentItem
              key={opponent.id}
              opponent={opponent}
              index={index}
              isSelected={isSelected}
              isPlayerWhoHasToPlay={isPlayerWhoHasToPlay}
              setSelectedOpponentIndex={setSelectedOpponentIndex}
            />
          )
        })}
    </div>
  )
}

type OpponentItemProps = {
  opponent: PlayerToJson
  index: number
  isSelected: boolean
  isPlayerWhoHasToPlay: boolean
  setSelectedOpponentIndex: (index: number) => void
}
const OpponentItem = ({
  opponent,
  index,
  isSelected,
  isPlayerWhoHasToPlay,
  setSelectedOpponentIndex,
}: OpponentItemProps) => {
  const {
    settings: { showPreviewOpponentsCardsForMobile },
  } = useSettings()
  const { game } = useGame()

  return (
    <m.button
      key={opponent.id}
      initial={{ opacity: 0, scale: 0.8, x: 50 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ display: "none", transition: { duration: 0 } }}
      onClick={() => setSelectedOpponentIndex(index)}
      className={cn(
        "flex flex-col items-center",
        isSelected && "font-semibold",
      )}
    >
      <UserAvatar
        player={opponent}
        size="tiny"
        animate={isPlayerWhoHasToPlay}
      />
      {game.settings.showCurrentScore && (
        <p className="text-center select-none text-xs text-gray-500 dark:text-gray-400">
          {getCurrentScore(opponent)}
        </p>
      )}
      {showPreviewOpponentsCardsForMobile && (
        <div className="flex flex-row gap-0.5">
          {opponent.cards.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-0.5">
              {column.map((card) => (
                <Card key={card.id} value={card.value} size="preview" />
              ))}
            </div>
          ))}
        </div>
      )}
    </m.button>
  )
}

export default OpponentsMobileView
