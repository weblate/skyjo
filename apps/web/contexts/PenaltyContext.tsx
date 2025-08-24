"use client"

import type { PenaltiesResponse, PenaltyData } from "@skymo/shared/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, PropsWithChildren, useContext } from "react"

interface PenaltyContextType {
  penalties: PenaltyData[]
  activeLeavebuster: PenaltyData | null
  hasActiveLeavebuster: boolean
  acknowledgePenalty: (penaltyId: number) => Promise<void>
  canPlay: boolean
  canChat: boolean
  isLoading: boolean
}

const PenaltyContext = createContext<PenaltyContextType | undefined>(undefined)

async function fetchActivePenalties(): Promise<PenaltyData[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/penalties/active`,
    {
      credentials: "include",
      next: {
        revalidate: 60,
      },
    },
  )

  if (!response.ok) {
    throw new Error("Failed to fetch penalties")
  }

  const data: PenaltiesResponse = await response.json()
  return data.penalties || []
}

export function PenaltyProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const { data: penalties = [], isLoading: penaltiesLoading } = useQuery({
    queryKey: ["penalties", "active"],
    queryFn: fetchActivePenalties,
  })
  const acknowledgePenaltyMutation = useMutation({
    mutationFn: async (penaltyId: number): Promise<void> => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/penalties/${penaltyId}/acknowledge`,
        {
          method: "POST",
          credentials: "include",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to acknowledge penalty")
      }
    },
    onSuccess: () => {
      // Invalidate and refetch penalty-related queries
      queryClient.invalidateQueries({ queryKey: ["penalties"] })
    },
  })

  const canPlay = !penalties.some(
    (p) => p.type === "leavebuster" || p.type === "tempban" || p.type === "ban",
  )
  const canChat = !penalties.some((p) => p.type === "chat_restrict")

  const activeLeavebuster =
    penalties.find(
      (p) =>
        p.type === "leavebuster" &&
        (p.completionsDone || 0) < (p.completionsRequired || 0),
    ) || null

  const hasActiveLeavebuster = !!activeLeavebuster

  return (
    <PenaltyContext.Provider
      value={{
        penalties,
        activeLeavebuster,
        hasActiveLeavebuster,
        acknowledgePenalty: acknowledgePenaltyMutation.mutateAsync,
        canPlay,
        canChat,
        isLoading: penaltiesLoading,
      }}
    >
      {children}
    </PenaltyContext.Provider>
  )
}

export function usePenalty() {
  const context = useContext(PenaltyContext)
  if (context === undefined) {
    throw new Error("usePenalty must be used within a PenaltyProvider")
  }
  return context
}
