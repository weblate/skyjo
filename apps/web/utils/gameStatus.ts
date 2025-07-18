import type { GameStatusResponse } from "@skymo/shared/types"

export async function getGameStatus(
  gameCode: string,
): Promise<GameStatusResponse | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/games/${gameCode}/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to get game status: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error fetching game status:", error)
    return null
  }
}
