"use client"

import { Locales } from "@skymo/shared/constants"
import { UserSettings } from "@skymo/shared/validations"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocalStorage } from "react-use"
import { useAuth } from "@/hooks/useAuth"

interface SettingsSyncState {
  isEnabled: boolean
  isLoading: boolean
  lastSyncTime: number | null
  error: string | null
}

interface UseSettingsSyncReturn {
  settingsSyncState: SettingsSyncState
  enableSettingsSync: () => void
  disableSettingsSync: () => void
  syncSettingsToServer: (settings: UserSettings) => Promise<void>
  syncSettingsFromServer: (force?: boolean) => Promise<Locales | undefined>
  isOnline: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const useSettingsSync = (): UseSettingsSyncReturn => {
  const [, setUserSettings] = useLocalStorage<UserSettings>("userSettings")
  const [syncState, setSyncState] = useLocalStorage<SettingsSyncState>(
    "settingsSyncState",
    {
      isEnabled: true,
      isLoading: false,
      lastSyncTime: null,
      error: null,
    },
  )

  const { isAuthenticated } = useAuth()
  const { setTheme } = useTheme()

  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    globalThis.addEventListener("online", handleOnline)
    globalThis.addEventListener("offline", handleOffline)

    return () => {
      globalThis.removeEventListener("online", handleOnline)
      globalThis.removeEventListener("offline", handleOffline)
    }
  }, [])

  const canSync = useMemo((): boolean => {
    const conditions = {
      enabled: syncState?.isEnabled ?? false,
      online: isOnline,
      authenticated: isAuthenticated ?? false,
    }

    return conditions.enabled && conditions.online && conditions.authenticated
  }, [syncState?.isEnabled, isOnline, isAuthenticated])

  const updateSyncState = useCallback(
    (updates: Partial<SettingsSyncState>) => {
      if (!syncState) return

      setSyncState({
        ...syncState,
        ...updates,
      })
    },
    [syncState, setSyncState],
  )

  const handleSyncError = useCallback(
    (error: unknown, operation: string) => {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed"
      console.error(`Failed to ${operation}:`, error)

      updateSyncState({
        isLoading: false,
        error: errorMessage,
      })
    },
    [updateSyncState],
  )

  const enableSettingsSync = useCallback(() => {
    updateSyncState({
      isEnabled: true,
      error: null,
    })
  }, [updateSyncState])

  const disableSettingsSync = useCallback(() => {
    updateSyncState({
      isEnabled: false,
      error: null,
    })
  }, [updateSyncState])

  const syncSettingsToServer = useCallback(
    async (settings: UserSettings) => {
      if (!canSync) return

      updateSyncState({
        isLoading: true,
        error: null,
      })

      try {
        const response = await fetch(`${API_BASE_URL}/users/me/settings`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings }),
        })

        if (!response.ok) {
          throw new Error(
            `Failed to sync settings to server: ${response.status}`,
          )
        }

        updateSyncState({
          isLoading: false,
          lastSyncTime: Date.now(),
          error: null,
        })
      } catch (error) {
        handleSyncError(error, "sync settings to server")
      }
    },
    [canSync, updateSyncState, handleSyncError],
  )

  const syncSettingsFromServer = useCallback(
    async (force?: boolean): Promise<Locales | undefined> => {
      if (!canSync && !force) return undefined

      updateSyncState({
        isLoading: true,
        error: null,
      })

      try {
        const response = await fetch(`${API_BASE_URL}/users/me/settings`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            updateSyncState({
              isLoading: false,
              error: null,
            })
            return
          }
          throw new Error(
            `Failed to fetch settings from server: ${response.status}`,
          )
        }

        const data = await response.json()

        if (data.settings && setUserSettings) {
          setUserSettings(data.settings)

          globalThis.dispatchEvent(
            new StorageEvent("storage", {
              key: "userSettings",
              newValue: JSON.stringify(data.settings),
              oldValue: localStorage.getItem("userSettings"),
              url: globalThis.location.href,
              storageArea: localStorage,
            }),
          )
        }

        setTheme(data.settings.theme)

        updateSyncState({
          isLoading: false,
          lastSyncTime: Date.now(),
          error: null,
        })

        return data.settings.locale
      } catch (error) {
        handleSyncError(error, "sync and apply settings from server")
      }
    },
    [canSync, updateSyncState, handleSyncError, setUserSettings],
  )

  return {
    settingsSyncState: syncState || {
      isEnabled: false,
      isLoading: false,
      lastSyncTime: null,
      error: null,
    },
    enableSettingsSync,
    disableSettingsSync,
    syncSettingsToServer,
    syncSettingsFromServer,
    isOnline,
  }
}
