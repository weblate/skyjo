"use client"

import { KickVoteDesktopView } from "@/components/KickVoteDesktopView"
import { useKick } from "@/contexts/KickContext"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { AnimatePresence } from "motion/react"

const KickVote = () => {
  const { kickVoteStatus } = useKick()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const visible = kickVoteStatus !== null

  return (
    <AnimatePresence>
      {visible && isDesktop && <KickVoteDesktopView />}
      {/* {visible && !isDesktop && <KickVoteMobileView />} */}
    </AnimatePresence>
  )
}

export { KickVote }
