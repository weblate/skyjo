import { Avatar } from "@skymo/core"
import { useQuery } from "@tanstack/react-query"

interface AuthenticatedUser {
  emailVerified: boolean
  name?: string | null
  username?: string | null
  avatar?: Avatar | null
  hasOAuth?: boolean
}

export const useAuthenticatedUser = () => {
  return useQuery({
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
} 