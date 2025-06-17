import { UserProfileResponse } from "@skymo/shared/types"
import { ApiResponse } from "@skymo/shared/types"

export async function fetchUserProfile(
  username: string,
): Promise<ApiResponse<UserProfileResponse, "not-found" | "unknown">> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/${username}`,
    )

    if (!response.ok) {
      if (response.status === 404) {
        return { error: "not-found" }
      }
      return { error: "unknown" }
    }

    return (await response.json()) as ApiResponse<
      UserProfileResponse,
      "not-found" | "unknown"
    >
  } catch (_error) {
    return {
      error: "unknown",
    }
  }
}
