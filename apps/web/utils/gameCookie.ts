import type { LastGame } from "@skymo/shared/validations"
import Cookies from "js-cookie"

const LAST_GAME_COOKIE_NAME = "skymo_last_game"

export const setLastGameCookie = (data: LastGame) => {
  Cookies.set(LAST_GAME_COOKIE_NAME, JSON.stringify(data), {
    expires: 7, // 7 days
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getLastGameCookie = (): LastGame | null => {
  const cookie = Cookies.get(LAST_GAME_COOKIE_NAME)
  return cookie ? JSON.parse(cookie) : null
}

export const clearLastGameCookie = () => {
  Cookies.remove(LAST_GAME_COOKIE_NAME)
}
