"use client"

import type {
  CanChatResponse,
  CanPlayResponse,
  CompleteLeavebusterResponse,
  PenaltiesResponse,
  PenaltyData,
} from "@skymo/shared/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext } from "react"

interface PenaltyContextType {
  penalties: PenaltyData[]
  activeLeavebuster: PenaltyData | null
  hasActiveLeavebuster: boolean
  completeLeavebuster: (
    penaltyId: number,
  ) => Promise<CompleteLeavebusterResponse>
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
    },
  )

  if (!response.ok) {
    throw new Error("Failed to fetch penalties")
  }

  const data: PenaltiesResponse = await response.json()
  return data.penalties || []
}

async function fetchCanPlay(): Promise<boolean> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/penalties/can-play`,
    {
      credentials: "include",
    },
  )

  if (!response.ok) {
    throw new Error("Failed to check can play")
  }

  const data: CanPlayResponse = await response.json()
  return data.canPlay
}

async function fetchCanChat(): Promise<boolean> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/penalties/can-chat`,
    {
      credentials: "include",
    },
  )

  if (!response.ok) {
    throw new Error("Failed to check can chat")
  }

  const data: CanChatResponse = await response.json()
  return data.canChat
}

export function PenaltyProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const { data: penalties = [], isLoading: penaltiesLoading } = useQuery({
    queryKey: ["penalties", "active"],
    queryFn: fetchActivePenalties,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const { data: canPlay = true, isLoading: canPlayLoading } = useQuery({
    queryKey: ["penalties", "can-play"],
    queryFn: fetchCanPlay,
    refetchOnWindowFocus: true,
  })

  const { data: canChat = true, isLoading: canChatLoading } = useQuery({
    queryKey: ["penalties", "can-chat"],
    queryFn: fetchCanChat,
    refetchOnWindowFocus: true,
  })

  const completeLeavebusterMutation = useMutation({
    mutationFn: async (
      penaltyId: number,
    ): Promise<CompleteLeavebusterResponse> => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/penalties/${penaltyId}/complete-leavebuster`,
        {
          method: "POST",
          credentials: "include",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to complete leavebuster")
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch penalty-related queries
      queryClient.invalidateQueries({ queryKey: ["penalties"] })
    },
  })

  const activeLeavebuster =
    penalties.find(
      (p) =>
        p.type === "leavebuster" &&
        (p.completionsDone || 0) < (p.completionsRequired || 0),
    ) || null

  const hasActiveLeavebuster = !!activeLeavebuster
  const isLoading = penaltiesLoading || canPlayLoading || canChatLoading

  const value: PenaltyContextType = {
    penalties,
    activeLeavebuster,
    hasActiveLeavebuster,
    completeLeavebuster: completeLeavebusterMutation.mutateAsync,
    canPlay,
    canChat,
    isLoading,
  }

  return (
    <PenaltyContext.Provider value={value}>{children}</PenaltyContext.Provider>
  )
}

export function usePenalty() {
  const context = useContext(PenaltyContext)
  if (context === undefined) {
    throw new Error("usePenalty must be used within a PenaltyProvider")
  }
  return context
}
