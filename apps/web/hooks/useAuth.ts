"use client"

import { useRouter } from "@/i18n/routing"
import { client } from "@/lib/rpc"
import { Avatar } from "@skymo/core"
import { LogoutError, VerifyError } from "@skymo/shared/types"
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

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authenticated-user"],
    queryFn: async (): Promise<AuthenticatedUser | undefined> => {
      try {
        const response = await client.auth.verify.$post()

        if (!response.ok) {
          const error = await jsonError<VerifyError>(response)
          toast.error(tErrors(error))
          return undefined
        }

        const result = await response.json()
        return {
          ...result.user,
          name: result.user.name ?? undefined,
          username: result.user.username ?? undefined,
        }
      } catch (error) {
        console.error(error)
        toast.error(tErrors("unexpected-error"))
      }
    },
    retry: 0,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await client.auth.logout.$post()

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
