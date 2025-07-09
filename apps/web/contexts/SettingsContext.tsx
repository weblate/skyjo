"use client"

import { Locales } from "@skymo/shared/constants"
import { Howler } from "howler"
import { ThemeProvider } from "next-themes"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useLocalStorage } from "react-use"
import SettingsDialog from "@/components/SettingsDialog"
import { useSettingsSync } from "@/hooks/useSettingsSync"

const VOLUME_DIVISOR = 100

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

export const Appearance = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const
export type Appearance = (typeof Appearance)[keyof typeof Appearance]

export const GameBoardSize = {
  NORMAL: "normal",
  BIG: "big",
} as const
export type GameBoardSize = (typeof GameBoardSize)[keyof typeof GameBoardSize]

interface Settings {
  // general
  locale: Locales
  // audio
  audio: boolean
  volume: number
  // display
  chatVisibility: boolean
  chatNotificationSize: ChatNotificationSize
  switchToPlayerWhoIsPlaying: boolean
  showPreviewOpponentsCardsForMobile: boolean
  gameBoardSize: GameBoardSize
  enlargeActivePlayerBoard: boolean
  timerDisplayMode: TimerDisplayMode
}
type SettingsKeys = keyof Settings

const DEFAULT_GAME_SETTINGS: Settings = {
  locale: "en",
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

interface SettingsContext {
  settings: Settings
  openSettings: () => void
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}
const SettingsContext = createContext<SettingsContext | undefined>(undefined)

interface SettingsProviderProps {
  children: React.ReactNode
  locale: Locales
}
const SettingsProvider = ({ children, locale }: SettingsProviderProps) => {
  const [settings, setSettings] = useLocalStorage<Settings>("userSettings", {
    ...DEFAULT_GAME_SETTINGS,
    locale,
  })

  const { syncToServer } = useSettingsSync()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // check all settings keys, if not present in settings, add them
    if (!settings) return

    Object.keys(DEFAULT_GAME_SETTINGS).forEach((defaultKey) => {
      const k = defaultKey as SettingsKeys

      if (settings[k] === undefined)
        setSettings({ ...settings, [k]: DEFAULT_GAME_SETTINGS[k] })
    })
  }, [settings])

  useEffect(() => {
    if (settings) Howler.mute(!settings.audio)
  }, [settings?.audio])

  useEffect(() => {
    if (settings) Howler.volume((settings.volume ?? 50) / VOLUME_DIVISOR)
  }, [settings?.volume])

  useEffect(() => {
    if (settings) setSettings({ ...settings, locale })
  }, [locale])

  const openSettings = () => setOpen(true)

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    if (settings) {
      const newSettings = { ...settings, [key]: value }
      setSettings(newSettings)

      // Sync to server if sync is enabled
      syncToServer(newSettings as any).catch((error) => {
        console.error("Failed to sync settings to server:", error)
      })
    }
  }

  const contextValue = useMemo(
    () => ({
      settings: settings!,
      openSettings,
      updateSetting,
    }),
    [settings, openSettings, updateSetting, syncToServer],
  )

  return (
    <SettingsContext.Provider value={contextValue}>
      <ThemeProvider attribute="class" enableSystem>
        {children}
        <SettingsDialog open={open} onOpenChange={setOpen} />
      </ThemeProvider>
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

export default SettingsProvider
