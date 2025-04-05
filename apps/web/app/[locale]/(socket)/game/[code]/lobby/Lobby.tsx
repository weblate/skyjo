"use client"

import CopyLink from "@/components/CopyLink"
import MenuDropdown from "@/components/MenuDropdown"
import { useGame } from "@/contexts/GameContext"
import { UpdateGameSettings } from "@skymo/shared/validations"
import { m } from "framer-motion"
import { useEffect } from "react"
import { useLocalStorage } from "react-use"
import {
  GameSettings,
  LobbyActions,
  LobbyHeader,
  LobbyPlayers,
} from "./components"

type LobbyProps = {
  gameCode: string
}

const Lobby = ({ gameCode }: LobbyProps) => {
  const { actions } = useGame()
  const [gameSettingsLocalStorage, setGameSettingsLocalStorage] =
    useLocalStorage<UpdateGameSettings>("gameSettings")

  useEffect(() => {
    const oldSettings = localStorage.getItem("settings")
    if (oldSettings) {
      const parsedOldSettings = JSON.parse(oldSettings)
      setGameSettingsLocalStorage(parsedOldSettings)

      localStorage.removeItem("settings")
    }

    if (gameSettingsLocalStorage) {
      const newSettings = { ...gameSettingsLocalStorage }
      actions.updateSettings(newSettings)
    }
  }, [gameSettingsLocalStorage, actions])

  return (
    <m.div
      className="relative h-svh w-full z-20 flex flex-col md:items-center mdh:md:justify-center overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full pt-4 px-4 flex justify-end lgh:md:absolute lgh:md:top-0 lgh:md:right-0">
        <MenuDropdown />
      </div>
      <div className="flex flex-col gap-4 md:gap-8 items-center h-fit w-full md:max-w-3xl lg:max-w-4xl p-4 pb-20 md:pb-4">
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-2xl w-full">
            <LobbyHeader />
            <GameSettings />
            <LobbyActions
              gameCode={gameCode}
              className="px-4 sm:px-8 mb-4 sm:mb-8"
            />
          </div>
          <LobbyPlayers />
        </div>
        <CopyLink gameCode={gameCode} />
      </div>
    </m.div>
  )
}

export default Lobby
