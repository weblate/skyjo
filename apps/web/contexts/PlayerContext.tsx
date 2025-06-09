"use client"

import { useAuth } from "@/hooks/useAuth"
import {
  Avatar,
  Constants as CoreConstants,
  CreatePlayer,
  createPlayer,
} from "@skymo/core"
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useLocalStorage } from "react-use"

const USERNAME_KEY = "username"
const AVATAR_KEY = "Avatar-index"

export const AVATARS_ARRAY = Object.values(CoreConstants.AVATARS)

interface PlayerContext {
  name: string
  avatarIndex: number
  playerId: string
  setName: Dispatch<SetStateAction<string>>
  setAvatarIndex: Dispatch<SetStateAction<number>>
  setPlayerId: Dispatch<SetStateAction<string>>
  savePlayer: () => CreatePlayer
  getPlayer: () => CreatePlayer
  getAvatar: () => Avatar
}

const PlayerContext = createContext<PlayerContext | undefined>(undefined)

const PlayerProvider = ({ children }: PropsWithChildren) => {
  const { user: authUser, isAuthenticated, refetch } = useAuth()
  const [preferredName, setPreferredName] = useLocalStorage<string>(
    USERNAME_KEY,
    "Ano",
    { raw: true },
  )
  const [preferredAvatarIndex, setPreferredAvatarIndex] =
    useLocalStorage<number>(AVATAR_KEY)

  const [name, setName] = useState<string>("Ano")
  const [avatarIndex, setAvatarIndex] = useState<number>(-1)
  const [playerId, setPlayerId] = useState<string>("")

  const getAvatarIndexFromName = (avatarName: Avatar): number => {
    return AVATARS_ARRAY.findIndex((avatar) => avatar === avatarName)
  }

  const getAvatarNameFromIndex = (index: number): Avatar => {
    return AVATARS_ARRAY[index] ?? CoreConstants.AVATARS.BEE
  }

  useEffect(() => {
    if (localStorage) {
      let initialName = ""
      let initialAvatarIndex = -1

      // Priority 1: Use authenticated user data if available
      if (isAuthenticated && authUser) {
        initialName = authUser.name || ""
        if (authUser.avatar) {
          initialAvatarIndex = getAvatarIndexFromName(authUser.avatar)
        }
      }
      // Priority 2: Use localStorage if no auth or auth data is incomplete
      else {
        if (preferredName) {
          initialName = preferredName
        }
        if (preferredAvatarIndex !== undefined && preferredAvatarIndex >= 0) {
          initialAvatarIndex = preferredAvatarIndex
        }
      }

      // Priority 3: Random avatar fallback if nothing is set
      if (initialAvatarIndex === -1) {
        initialAvatarIndex = Math.floor(Math.random() * AVATARS_ARRAY.length)
      }

      setName(initialName)
      setAvatarIndex(initialAvatarIndex)
    }
  }, [])

  const getAvatar = () => {
    return getAvatarNameFromIndex(avatarIndex)
  }

  const updateUserProfile = async (newName: string, newAvatar: Avatar) => {
    if (!isAuthenticated || !authUser) return

    try {
      let hasAnUpdate = false
      if (newName !== authUser.name) {
        hasAnUpdate = true
        const nameResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/name`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ name: newName }),
          },
        )

        if (!nameResponse.ok) {
          throw new Error("Failed to update name")
        }
      }

      if (newAvatar !== authUser.avatar) {
        hasAnUpdate = true
        const avatarResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/avatar`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ avatar: newAvatar }),
          },
        )

        if (!avatarResponse.ok) {
          throw new Error("Failed to update avatar")
        }
      }

      if (hasAnUpdate) {
        refetch()
      }
    } catch (error) {
      console.error("Failed to update user profile:", error)
    }
  }

  const savePlayer = () => {
    const player = createPlayer.parse({ name, avatar: getAvatar() })

    setPreferredName(player.name)
    setPreferredAvatarIndex(avatarIndex)

    if (isAuthenticated) {
      updateUserProfile(player.name, player.avatar)
    }

    return player
  }

  const getPlayer = () => {
    return { name: name ?? "Ano", avatar: getAvatar() }
  }

  const value = useMemo(
    () => ({
      name,
      avatarIndex,
      setName,
      setAvatarIndex,
      savePlayer,
      getAvatar,
      getPlayer,
      playerId,
      setPlayerId,
    }),
    [name, avatarIndex, playerId],
  )

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}

export default PlayerProvider
