"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "@/i18n/routing"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

export default function CallbackLogic() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading, refetch } = useAuth()

  useEffect(() => {
    // Invalidate auth cache to force fresh data after OAuth
    queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })

    // Refetch user data to ensure we have the latest information
    refetch()
  }, [queryClient, refetch])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      // If no user, redirect to login
      router.replace("/login")
      return
    }

    // Check if user needs to complete onboarding
    if (!user.onboardingCompleted) {
      router.replace("/onboard")
      return
    }

    // If user is fully authenticated and onboarded, redirect to home
    router.replace("/")
  }, [user, isLoading, router])

  return null
}
