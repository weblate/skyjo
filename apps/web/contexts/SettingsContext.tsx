"use client"

import { DEFAULT_GAME_SETTINGS, Locales } from "@skymo/shared/constants"
import { UserSettings } from "@skymo/shared/validations"
import { Howler } from "howler"
import { ThemeProvider, useTheme } from "next-themes"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useLocalStorage } from "react-use"
import SettingsDialog from "@/components/SettingsDialog"
import { useSettingsSync } from "@/hooks/useSettingsSync"

const VOLUME_DIVISOR = 100

interface SettingsContext {
  settings: UserSettings
  openSettings: () => void
  updateSetting: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => void
}
const SettingsContext = createContext<SettingsContext | undefined>(undefined)

// ThemeSync component that must be used inside ThemeProvider but outside SettingsProvider
const ThemeSync = ({ theme }: { theme: string }) => {
  const { setTheme } = useTheme()

  // Only sync from settings to next-themes (one-way sync)
  useEffect(() => {
    if (theme) setTheme(theme)
  }, [theme, setTheme])

  return null
}

interface SettingsProviderProps {
  children: React.ReactNode
  locale: Locales
}
const SettingsProvider = ({ children, locale }: SettingsProviderProps) => {
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    "userSettings",
    {
      ...DEFAULT_GAME_SETTINGS,
      locale,
    },
  )

  const { syncSettingsToServer } = useSettingsSync()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!settings) return

    Object.keys(DEFAULT_GAME_SETTINGS).forEach((defaultKey) => {
      const k = defaultKey as keyof UserSettings

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

  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      if (settings) {
        const newSettings = { ...settings, [key]: value }

        setSettings(newSettings)

        syncSettingsToServer(newSettings).catch((error) => {
          console.error("Failed to sync settings to server:", error)
        })
      }
    },
    [settings, setSettings, syncSettingsToServer],
  )

  const contextValue = useMemo(
    () => ({
      settings: settings!,
      openSettings,
      updateSetting,
    }),
    [settings, updateSetting],
  )

  if (!settings) return null

  return (
    <SettingsContext.Provider value={contextValue}>
      <ThemeProvider attribute="class" enableSystem>
        <ThemeSync theme={settings.theme} />
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
