"use client"

import { useTranslations } from "next-intl"
import { usePenalty } from "@/contexts/PenaltyContext"
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
  const t = useTranslations("components.PenaltyCheck")
  const { penalties } = usePenalty()

  // Find penalties by priority
  const activeBan = penalties.find((penalty) => penalty.type === "ban")

  // Priority 1: Permanent ban (blocks everything)
  if (activeBan) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md mx-4 shadow-xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              {t("ban.title")}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {activeBan.reason}
            </p>
            <p className="text-sm text-gray-500">{t("ban.permanent")}</p>
          </div>
        </div>
      </div>
    )
  }

  // Priority 2: Temporary ban (blocks everything except permanent ban)
  const activeTempban = penalties.find((penalty) => penalty.type === "tempban")
  if (activeTempban) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md mx-4 shadow-xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              {t("tempban.title")}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {activeTempban.reason}
            </p>
            {activeTempban.expiresAt && (
              <p className="text-sm text-gray-500">
                {t("tempban.expiresAt", {
                  date: new Date(activeTempban.expiresAt).toLocaleString(),
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    )
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
