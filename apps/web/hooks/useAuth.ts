"use client"

import { useRouter } from "@/i18n/routing"
import { Avatar } from "@skymo/core"
import { LogoutError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

interface AuthenticatedUser {
  emailVerified: boolean
  email?: string
  name?: string
  username?: string
  avatar?: Avatar
  hasOAuth?: boolean
  onboardingCompleted?: boolean
}

export const useAuth = () => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const tErrors = useTranslations("errors")

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
          {
            method: "POST",
          },
        )

        if (!response.ok) {
          const error = await jsonError<LogoutError>(response)
          toast.error(tErrors(error))
        }

        return response.json()
      } catch (error) {
        console.log(error)
        toast.error(tErrors("unexpected-error"))
      }
    },
    onSuccess: () => {
      router.push("/")
      queryClient.setQueryData(["authenticated-user"], null)
      queryClient.invalidateQueries({ queryKey: ["authenticated-user"] })
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
        console.error(error)
        return null
      }
    },
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

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
