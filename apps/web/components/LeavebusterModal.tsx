"use client"

import type {
  CompleteLeavebusterResponse,
  PenaltyData,
} from "@skymo/shared/types"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"

interface LeavebusterModalProps {
  penalty: PenaltyData
  onComplete: (penaltyId: number) => Promise<CompleteLeavebusterResponse>
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function LeavebusterModal({
  penalty,
  onComplete,
}: LeavebusterModalProps) {
  const t = useTranslations("components.LeavebusterModal")
  const [timeLeft, setTimeLeft] = useState(penalty.displayDuration || 10)
  const [canAccept, setCanAccept] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanAccept(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanAccept(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  async function handleAccept() {
    if (!canAccept || isCompleting) return

    setIsCompleting(true)
    try {
      await onComplete(penalty.id)
    } catch (error) {
      console.error("Failed to complete leavebuster:", error)
      setIsCompleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md mx-4 shadow-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">{t("title")}</h2>

          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {t("description")}
          </p>

          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg mb-6">
            <p className="text-lg font-semibold text-red-800 dark:text-red-200">
              {t("progress", {
                completed: penalty.completionsDone || 0,
                required: penalty.completionsRequired || 0,
              })}
            </p>
          </div>

          <div className="mb-6">
            {timeLeft > 0 ? (
              <div>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2 font-mono">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("timeRemaining", { time: formatTime(timeLeft) })}
                </p>
              </div>
            ) : (
              <Button
                onClick={handleAccept}
                disabled={isCompleting}
                className="px-8 py-3 text-lg"
              >
                {isCompleting
                  ? t("completedButton")
                  : t("completeButton", { time: formatTime(timeLeft) })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
