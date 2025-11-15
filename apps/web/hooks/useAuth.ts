"use client"

import { Avatar } from "@skymo/core"
import { LogoutError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import posthog from "posthog-js"
import { useEffect } from "react"
import { toast } from "sonner"
import { usePathname, useRouter } from "@/i18n/routing"

interface AuthenticatedUser {
  id: number
  email?: string
  name?: string
  username?: string
  avatar?: Avatar
  hasOAuth?: boolean
  onboardingCompleted?: boolean
  role?: string
}

export const useAuth = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const tErrors = useTranslations("errors")
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
          {
            method: "POST",
            credentials: "include",
          },
        )

        if (!response.ok) {
          const error = await jsonError<LogoutError>(response)
          toast.error(tErrors(error))
        }

        router.push("/")
        queryClient.setQueryData(["authenticated-user"], null)
        queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })
      } catch (error) {
        console.log(error)
        toast.error(tErrors("unexpected-error"))
      }
    },
    onError: (error) => {
      console.error("Logout error:", error)

      queryClient.setQueryData(["authenticated-user"], null)
      queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })
    },
  })

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authenticated-user"],
    queryFn: async (): Promise<AuthenticatedUser | null> => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
          {
            method: "POST",
            credentials: "include",
          },
        )

        if (!response.ok) {
          return null
        }

        const result = await response.json()

        return {
          ...result.user,
          name: result.user.name ?? undefined,
          username: result.user.username ?? undefined,
        }
      } catch (error) {
        posthog.captureException(error, {
          section: "auth",
          action: "session_verification",
          pathname,
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
        })
        return null
      }
    },
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  useEffect(() => {
    if (!user) return

    // Skip client-side redirects for auth flow pages to prevent infinite loops
    // These redirects are handled by server-side layouts
    const isAuthFlowPage = pathname === "/onboard" || pathname === "/login"
    if (isAuthFlowPage) return

    if (!user.onboardingCompleted) {
      router.replace("/onboard")
    }
  }, [user, pathname, router])

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user && !error,
    refetch,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    logoutError: logoutMutation.error,
  }
}
