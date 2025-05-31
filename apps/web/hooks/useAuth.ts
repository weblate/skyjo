"use client"

import { Avatar } from "@skymo/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface AuthenticatedUser {
  emailVerified: boolean
  name?: string
  username?: string
  avatar?: Avatar
  hasOAuth?: boolean
  onboardingCompleted?: boolean
}

export const useAuth = () => {
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["authenticated-user"],
    queryFn: async (): Promise<AuthenticatedUser> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      )
      if (!res.ok) {
        throw new Error("Failed to verify user")
      }
      const result = await res.json()
      return result.user
    },
    retry: 0,
    refetchOnWindowFocus: false,
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      )

      if (!response.ok) {
        throw new Error("Logout failed")
      }
    },
    onSuccess: () => {
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
    // Authentication state
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
