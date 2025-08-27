"use client"

import { usePenalty } from "@/contexts/PenaltyContext"
import { BanDialog } from "./BanDialog"
import { ChatRestrictionDialog } from "./ChatRestrictionDialog"
import { LeavebusterDialog } from "./LeavebusterDialog"

/**
 * Component that checks for active penalties and shows appropriate modals.
 * Add this component directly to pages where penalties should be displayed
 * (homepage, search/browse pages).
 *
 * Priority: BAN > TEMPBAN > CHAT_RESTRICT > LEAVEBUSTER
 */
export function PenaltyCheck() {
  const { penalties } = usePenalty()

  // Find penalties by priority
  const activeBan = penalties.find((penalty) => penalty.type === "ban")

  // Priority 1: Permanent ban (blocks everything)
  if (activeBan) {
    return <BanDialog penalty={activeBan} />
  }

  // Priority 2: Temporary ban (blocks everything except permanent ban)
  const activeTempban = penalties.find((penalty) => penalty.type === "tempban")
  if (activeTempban) {
    return <BanDialog penalty={activeTempban} />
  }

  // Priority 3: Chat restriction (only shows if not acknowledged)
  const activeChatRestrict = penalties.find(
    (penalty) => penalty.type === "chat_restrict" && !penalty.acknowledgedAt,
  )
  if (activeChatRestrict) {
    return <ChatRestrictionDialog penalty={activeChatRestrict} />
  }

  // Priority 4: Leavebuster (only shows if no ban/tempban/chat restriction)
  const activeLeavebuster = penalties.find(
    (penalty) =>
      penalty.type === "leavebuster" &&
      (penalty.completionsDone || 0) < (penalty.completionsRequired || 0),
  )
  if (activeLeavebuster) {
    return <LeavebusterDialog penalty={activeLeavebuster} />
  }

  return null
}
