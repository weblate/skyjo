"use client"

import { m } from "motion/react"
import CopyLink from "@/components/CopyLink"
import GameDropdownMenu from "@/components/GameDropdownMenu"
import {
  GameSettings,
  LobbyActions,
  LobbyHeader,
  LobbyPlayers,
} from "./components"

interface LobbyProps {
  gameCode: string
}

const Lobby = ({ gameCode }: LobbyProps) => {
  return (
    <m.div
      className="relative h-svh w-full z-20 flex flex-col md:items-center mdh:md:justify-center overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full pt-4 px-4 flex justify-end lgh:md:absolute lgh:md:top-0 lgh:md:right-0">
        <GameDropdownMenu />
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
