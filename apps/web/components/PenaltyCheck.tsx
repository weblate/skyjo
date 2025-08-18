"use client"

import { useTranslations } from "next-intl"
import { usePenalty } from "@/contexts/PenaltyContext"
import { LeavebusterModal } from "./LeavebusterModal"

/**
 * Component that checks for active penalties and shows appropriate modals.
 * Add this component directly to pages where penalties should be displayed
 * (homepage, search/browse pages).
 *
 * Priority: BAN > TEMPBAN > LEAVEBUSTER
 */
export function PenaltyCheck() {
  const t = useTranslations("components.PenaltyCheck")
  const { penalties, completeLeavebuster } = usePenalty()

  // Find penalties by priority
  const activeBan = penalties.find((penalty) => penalty.type === "ban")
  const activeTempban = penalties.find((penalty) => penalty.type === "tempban")
  const activeLeavebuster = penalties.find(
    (penalty) =>
      penalty.type === "leavebuster" &&
      (penalty.completionsDone || 0) < (penalty.completionsRequired || 0),
  )

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

  // Priority 3: Leavebuster (only shows if no ban/tempban)
  if (activeLeavebuster) {
    return (
      <LeavebusterModal
        penalty={activeLeavebuster}
        onComplete={completeLeavebuster}
      />
    )
  }

  return null
}
