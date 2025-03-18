"use client"

import { Chat } from "@/components/Chat"
import withAuth from "@/components/withAuth"
import { BanProvider } from "@/contexts/BanContext"
import ChatProvider from "@/contexts/ChatContext"
import SkyjoProvider from "@/contexts/SkyjoContext"
import { VoteKickProvider } from "@/contexts/VoteKickContext"
import { PropsWithChildren, use } from "react"

type GameLayoutParams = {
  code: string
  locale: string
}
type GameLayoutProps = PropsWithChildren & {
  params: Promise<GameLayoutParams>
}
const GameLayout = ({ children, params: paramsPromise }: GameLayoutProps) => {
  const params = use<GameLayoutParams>(paramsPromise)

  return (
    <ChatProvider>
      <SkyjoProvider gameCode={params.code}>
        <VoteKickProvider>
          <BanProvider>
            <div className="w-svh h-svh bg-[url('/svg/background.svg')] dark:bg-[url('/svg/background-dark.svg')] flex flex-row overflow-hidden">
              {children}
              <Chat className="z-40" />
            </div>
          </BanProvider>
        </VoteKickProvider>
      </SkyjoProvider>
    </ChatProvider>
  )
}

export default withAuth(GameLayout)
