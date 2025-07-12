"use client"

import { Locales } from "@skymo/shared/constants"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useSettingsSync } from "@/hooks/useSettingsSync"
import { useRouter } from "@/i18n/routing"

interface CallbackLogicProps {
  locale: Locales
}
export default function CallbackLogic({ locale }: CallbackLogicProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading, refetch } = useAuth()
  const { syncSettingsFromServer, settingsSyncState } = useSettingsSync()

  useEffect(() => {
    // Invalidate auth cache to force fresh data after OAuth
    queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })

    // Refetch user data to ensure we have the latest information
    refetch()
  }, [queryClient, refetch])

  useEffect(() => {
    if (isLoading) return

    const handleCallback = async () => {
      if (!user) {
        // If no user, redirect to login
        router.replace("/login")
        return
      }

      // Sync settings from server if enabled + get the new locale
      let newLocale = locale
      if (settingsSyncState?.isEnabled) {
        const syncLocale = await syncSettingsFromServer()
        if (syncLocale) newLocale = syncLocale
      }

      // Check if user needs to complete onboarding
      if (!user.onboardingCompleted) {
        router.replace("/onboard", { locale: newLocale })
        return
      }

      // If user is fully authenticated and onboarded, redirect to home
      router.replace("/", { locale: newLocale })
    }

    handleCallback()
  }, [user, isLoading, router])

  return null
}
