"use client"

import { UserSettings } from "@skymo/shared/validations"
import { useCallback, useEffect, useState } from "react"
import { useLocalStorage } from "react-use"

interface SettingsSyncState {
  isEnabled: boolean
  isLoading: boolean
  lastSyncTime: number | null
  error: string | null
}

interface UseSettingsSyncReturn {
  syncState: SettingsSyncState
  enableSync: () => void
  disableSync: () => void
  syncToServer: (settings: UserSettings) => Promise<void>
  syncFromServer: () => Promise<UserSettings | null>
  syncFromServerAndApply: () => Promise<void>
  isOnline: boolean
}

export const useSettingsSync = (): UseSettingsSyncReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Local storage for sync state
  const [syncState, setSyncState] = useLocalStorage<SettingsSyncState>(
    "settingsSyncState",
    {
      isEnabled: true,
      isLoading: false,
      lastSyncTime: null,
      error: null,
    },
  )

  // Local storage for user settings
  const [, setUserSettings] = useLocalStorage<UserSettings>("userSettings")

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const enableSync = useCallback(() => {
    if (!syncState) return

    setSyncState({
      ...syncState,
      isEnabled: true,
      error: null,
    })
  }, [syncState, setSyncState])

  const disableSync = useCallback(() => {
    if (!syncState) return

    setSyncState({
      ...syncState,
      isEnabled: false,
      error: null,
    })
  }, [syncState, setSyncState])

  const syncToServer = useCallback(
    async (settings: UserSettings) => {
      if (!syncState?.isEnabled || !isOnline) {
        return
      }

      setSyncState({
        ...syncState,
        isLoading: true,
        error: null,
      })

      try {
        const response = await fetch("/api/users/me/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings }),
        })

        if (!response.ok) {
          throw new Error("Failed to sync settings to server")
        }

        setSyncState({
          ...syncState,
          isLoading: false,
          lastSyncTime: Date.now(),
          error: null,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Sync failed"

        setSyncState({
          ...syncState,
          isLoading: false,
          error: errorMessage,
        })
      }
    },
    [syncState, setSyncState, isOnline],
  )

  const syncFromServer = useCallback(async (): Promise<UserSettings | null> => {
    if (!syncState?.isEnabled || !isOnline) {
      return null
    }

    setSyncState({
      ...syncState,
      isLoading: true,
      error: null,
    })

    try {
      const response = await fetch("/api/users/me/settings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch settings from server")
      }

      const data = await response.json()

      setSyncState({
        ...syncState,
        isLoading: false,
        lastSyncTime: Date.now(),
        error: null,
      })

      return data.settings
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed"

      setSyncState({
        ...syncState,
        isLoading: false,
        error: errorMessage,
      })

      return null
    }
  }, [syncState, setSyncState, isOnline])

  const syncFromServerAndApply = useCallback(async () => {
    if (!syncState?.isEnabled || !isOnline) {
      return
    }

    setSyncState({
      ...syncState,
      isLoading: true,
      error: null,
    })

    try {
      const response = await fetch("/api/users/me/settings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch settings from server")
      }

      const data = await response.json()

      // Apply server settings to localStorage
      if (data.settings && setUserSettings) {
        setUserSettings(data.settings)
      }

      setSyncState({
        ...syncState,
        isLoading: false,
        lastSyncTime: Date.now(),
        error: null,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed"

      setSyncState({
        ...syncState,
        isLoading: false,
        error: errorMessage,
      })
    }
  }, [syncState, setSyncState, isOnline, setUserSettings])

  return {
    syncState: syncState || {
      isEnabled: false,
      isLoading: false,
      lastSyncTime: null,
      error: null,
    },
    enableSync,
    disableSync,
    syncToServer,
    syncFromServer,
    syncFromServerAndApply,
    isOnline,
  }
}
