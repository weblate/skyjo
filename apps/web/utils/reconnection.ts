import { LastGame } from "@skymo/shared/validations"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

export const getLastGame = () => {
  if (typeof window === "undefined") return null
  const lastGameString = localStorage.getItem("lastGame")

  if (!lastGameString) return null

  return JSON.parse(lastGameString) as LastGame
}

export const clearLastGame = () => localStorage.removeItem("lastGame")
