"use client"

import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"
import { usePenalty } from "@/contexts/PenaltyContext"
import { Button } from "./ui/button"

interface PlayAgainButtonProps {
  readonly onPlayAgain: () => void
  readonly className?: ClassValue
}
export function PlayAgainButton({
  onPlayAgain,
  className,
}: PlayAgainButtonProps) {
  const t = useTranslations("components.PlayAgainButton")
  const { canPlay, hasActiveLeavebuster } = usePenalty()

  if (!canPlay) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button
          disabled
          className={`opacity-50 cursor-not-allowed ${className}`}
        >
          {t("disabled")}
        </Button>
        {hasActiveLeavebuster && (
          <p className="text-sm text-red-500 text-center max-w-xs">
            {t("leavebusterMessage")}
          </p>
        )}
      </div>
    )
  }

  return (
    <Button onClick={onPlayAgain} className={className}>
      {t("button")}
    </Button>
  )
}
