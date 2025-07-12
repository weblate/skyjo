import type { UserSettings } from "@/validations/index.js"

export const TimerDisplayMode = {
  NEVER: "never",
  SMART: "smart",
  ALWAYS: "always",
} as const
export type TimerDisplayMode =
  (typeof TimerDisplayMode)[keyof typeof TimerDisplayMode]

export const ChatNotificationSize = {
  SMALL: "small",
  NORMAL: "normal",
  BIG: "big",
} as const
export type ChatNotificationSize =
  (typeof ChatNotificationSize)[keyof typeof ChatNotificationSize]

export const GameBoardSize = {
  NORMAL: "normal",
  BIG: "big",
} as const
export type GameBoardSize = (typeof GameBoardSize)[keyof typeof GameBoardSize]

export const DEFAULT_GAME_SETTINGS: UserSettings = {
  locale: "en",
  theme: "system",
  audio: true,
  volume: 50,
  chatVisibility: true,
  chatNotificationSize: ChatNotificationSize.NORMAL,
  switchToPlayerWhoIsPlaying: true,
  showPreviewOpponentsCardsForMobile: true,
  gameBoardSize: GameBoardSize.NORMAL,
  enlargeActivePlayerBoard: false,
  timerDisplayMode: TimerDisplayMode.SMART,
}
