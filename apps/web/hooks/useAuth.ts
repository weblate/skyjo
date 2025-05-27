import { Avatar } from "@skymo/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface AuthenticatedUser {
  emailVerified: boolean
  name?: string | null
  username?: string | null
  avatar?: Avatar | null
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
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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
      // Clear authentication queries
      queryClient.removeQueries({ queryKey: ["authenticated-user"] })
    },
    onError: (error) => {
      console.error("Logout error:", error)
      queryClient.removeQueries({ queryKey: ["authenticated-user"] })
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
