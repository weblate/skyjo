"use client"

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

interface UserContext {
  name: string
  avatarIndex: number
  playerId: string
  setName: Dispatch<SetStateAction<string>>
  setAvatarIndex: Dispatch<SetStateAction<number>>
  setPlayerId: Dispatch<SetStateAction<string>>
  saveUserInLocalStorage: () => CreatePlayer
  getUser: () => CreatePlayer
  getAvatar: () => Avatar
}

const UserContext = createContext<UserContext | undefined>(undefined)

const UserProvider = ({ children }: PropsWithChildren) => {
  const [preferredName, setPreferredName] = useLocalStorage<string>(
    USERNAME_KEY,
    "",
    { raw: true },
  )
  const [preferredAvatarIndex, setPreferredAvatarIndex] =
    useLocalStorage<number>(AVATAR_KEY)

  const [name, setName] = useState<string>("")
  const [avatarIndex, setAvatarIndex] = useState<number>(-1)
  const [playerId, setPlayerId] = useState<string>("")

  useEffect(() => {
    if (localStorage) {
      if (preferredName) setName(preferredName)
      if (preferredAvatarIndex) setAvatarIndex(preferredAvatarIndex)
      else {
        const randomIndex = Math.floor(Math.random() * AVATARS_ARRAY.length)
        setAvatarIndex(randomIndex)
      }
    }
  }, [preferredName, preferredAvatarIndex])

  const getAvatar = () => {
    return AVATARS_ARRAY[avatarIndex] ?? CoreConstants.AVATARS.BEE
  }

  const saveUserInLocalStorage = () => {
    const player = createPlayer.parse({ name, avatar: getAvatar() })
    setPreferredName(player.name)
    setPreferredAvatarIndex(avatarIndex)

    return player
  }

  const getUser = () => {
    return { name: name ?? "Ano", avatar: getAvatar() }
  }

  const value = useMemo(
    () => ({
      name,
      avatarIndex,
      setName,
      setAvatarIndex,
      saveUserInLocalStorage,
      getAvatar,
      getUser,
      playerId,
      setPlayerId,
    }),
    [name, avatarIndex, playerId],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

export default UserProvider
