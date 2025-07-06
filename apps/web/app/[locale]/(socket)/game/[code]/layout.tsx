"use client"

import { use } from "react"
import { Chat } from "@/components/Chat"
import { KickVote } from "@/components/KickVote"
import withAuth from "@/components/withAuth"
import { BanProvider } from "@/contexts/BanContext"
import ChatProvider from "@/contexts/ChatContext"
import GameProvider from "@/contexts/GameContext"
import { KickProvider } from "@/contexts/KickContext"
import { ReportProvider } from "@/contexts/ReportContext"

interface GameLayoutParams {
  code: string
  locale: string
}
interface GameLayoutProps {
  children: React.ReactNode
  params: Promise<GameLayoutParams>
}
const GameLayout = ({ children, params: paramsPromise }: GameLayoutProps) => {
  const params = use<GameLayoutParams>(paramsPromise)

  return (
    <GameProvider gameCode={params.code}>
      <ChatProvider>
        <ReportProvider>
          <KickProvider>
            <BanProvider>
              <div className="h-svh bg-[url('/svg/background.svg')] dark:bg-[url('/svg/background-dark.svg')] flex flex-row overflow-hidden">
                {children}
                <KickVote />
                <Chat className="z-40" />
              </div>
            </BanProvider>
          </KickProvider>
        </ReportProvider>
      </ChatProvider>
    </GameProvider>
  )
}
export default withAuth(GameLayout)
