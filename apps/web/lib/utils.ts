import { routing } from "@/i18n/routing"
import { Constants as CoreConstants, GameStatus } from "@skymo/core"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getGameInviteLink = (gameCode: string) => {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/?gameCode=${gameCode}`
}

export const getCurrentUrl = (route: string, locale?: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const path = route ? `/${route}` : ""

  return locale && locale !== routing.defaultLocale
    ? `${baseUrl}/${locale}${path}`
    : `${baseUrl}${path}`
}

export const getRedirectionUrl = (code: string, status: GameStatus) => {
  const redirectionUrls = {
    [CoreConstants.GAME_STATUS.LOBBY]: `/game/${code}/lobby`,
    [CoreConstants.GAME_STATUS.PLAYING]: `/game/${code}`,
    [CoreConstants.GAME_STATUS.STOPPED]: `/game/${code}/results`,
    [CoreConstants.GAME_STATUS.FINISHED]: `/game/${code}/results`,
  } as const

  return redirectionUrls[status]
}

/**
 * Format number in compact notation (1K, 12.3K, etc.)
 */
export function formatCompactNumber(
  value: number,
  locale: string = "en",
): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
