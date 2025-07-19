import type { PenaltyScore, PlayerScore } from "@skymo/core"
import React from "react"

/**
 * Checks if a score entry has a penalty applied
 */
export const isPenalizedScore = (score: PlayerScore): score is PenaltyScore => {
  return typeof score === "object"
}

/**
 * Formats a score entry for display with penalty information
 * Returns JSX with styled penalty for penalized scores or plain text for normal scores
 */
export const formatScoreDisplay = (score: PlayerScore): React.ReactNode => {
  if (score === "-") return "-"

  // Score is an object with score, penalty, and originalScore properties
  if (isPenalizedScore(score)) {
    return (
      <p className="inline">
        {score.originalScore}{" "}
        <span className="text-red-600">+ {score.penalty}</span>
      </p>
    )
  }

  return score.toString()
}

/**
 * Gets the numeric value of a score entry
 */
export const getScoreValue = (score: PlayerScore): number => {
  if (score === "-") return 0
  if (typeof score === "number") return score
  return score.score
}

/**
 * Gets the original score value before penalty
 */
export const getOriginalScoreValue = (score: PlayerScore): number => {
  if (score === "-") return 0
  if (typeof score === "number") return score
  return score.originalScore ?? score.score
}

/**
 * Gets the penalty amount for a score entry
 */
export const getPenaltyAmount = (score: PlayerScore): number => {
  if (score === "-") return 0
  if (typeof score === "number") return 0
  return score.penalty ?? 0
}

/**
 * Checks if a score entry should be displayed with penalty styling
 */
export const shouldShowPenaltyIndicator = (score: PlayerScore): boolean => {
  return isPenalizedScore(score)
}

/**
 * Creates a tooltip content for penalty information
 */
export const getPenaltyTooltipContent = (score: PlayerScore): string | null => {
  if (!isPenalizedScore(score)) return null

  const originalScore = getOriginalScoreValue(score)
  const penalty = getPenaltyAmount(score)
  const finalScore = getScoreValue(score)

  return `Original score: ${originalScore}\nPenalty: +${penalty}\nFinal score: ${finalScore}`
}

/**
 * Backward compatibility function to handle old score format
 */
export const normalizeScore = (score: number | PlayerScore): PlayerScore => {
  if (typeof score === "number") {
    return { score }
  }
  return score
}
