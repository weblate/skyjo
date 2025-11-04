"use client"

import { Constants as CoreConstants, SystemMessageType } from "@skymo/core"
import {
  ChatMessage,
  ServerChatMessage,
  SystemChatMessage,
  UserChatMessage,
} from "@skymo/shared/types"
import { Howl } from "howler"
import { useTranslations } from "next-intl"
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useSocket } from "@/contexts/SocketContext"
import { usePathname } from "@/i18n/routing"

const messageSound = new Howl({
  src: ["/sounds/message.ogg"],
})
const playerJoinedSound = new Howl({
  src: ["/sounds/player-joined.ogg"],
})
const playerLeftSound = new Howl({
  src: ["/sounds/player-left.ogg"],
})
const wizzSound = new Howl({
  src: "/sounds/wizz.ogg",
})

interface ChatContext {
  chat: ChatMessage[]
  unreadMessages: ChatMessage[]
  hasUnreadMessage: boolean
  setHasUnreadMessage: (hasUnreadMessage: boolean) => void
  addUnreadMessage: (message: ChatMessage) => void
  clearUnreadMessages: () => void
  setChat: (chat: ChatMessage[]) => void
  sendMessage: (message: string) => void
  addSystemMessage: (message: string) => void
  mutedPlayers: string[]
  mutePlayer: (name: string) => void
  unmutePlayer: (name: string) => void
  toggleMutePlayer: (name: string) => void
  wizzPlayer: (targetName: string) => void
  draftMessage: string
  setDraftMessage: (message: string) => void
  clearDraftMessage: () => void
}

const ChatContext = createContext<ChatContext | undefined>(undefined)

const ChatProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket()
  const { name } = usePlayer()
  const {
    settings: { chatVisibility },
  } = useSettings()
  const t = useTranslations("utils.chat")
  const pathname = usePathname()

  const [chat, setChat] = useState<ChatMessage[]>([])
  const [unreadMessages, setUnreadMessages] = useState<ChatMessage[]>([])
  const [hasUnreadMessage, setHasUnreadMessage] = useState<boolean>(false)
  const [draftMessage, setDraftMessage] = useState<string>("")

  const [mutedPlayers, setMutedPlayers] = useState<string[]>([])

  useEffect(() => {
    if (!chatVisibility) return

    if (socket) {
      socket.on("message", onMessageReceived)
      socket.on("message:system", onSystemMessageReceived)
      socket.on("message:server", onServerMessageReceived)
      socket.on("wizz", onWizzReceived)
    }

    return () => {
      if (socket) {
        socket.off("message", onMessageReceived)
        socket.off("message:system", onSystemMessageReceived)
        socket.off("message:server", onServerMessageReceived)
        socket.off("wizz", onWizzReceived)
      }
    }
  }, [socket, chatVisibility, mutedPlayers])

  useEffect(() => {
    if (!pathname.includes("/game/")) {
      setChat([])
    }
  }, [pathname])

  const sendMessage = (message: string) => {
    socket!.send({
      message,
    })
  }

  //#region Message received
  const onMessageReceived = (message: UserChatMessage) => {
    if (mutedPlayers.includes(message.name)) return

    messageSound.play()
    setChat((prev) => [message, ...prev])
  }

  const onServerMessageReceived = (message: ServerChatMessage) => {
    if (
      message.type === CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_JOINED ||
      message.type === CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_RECONNECT
    ) {
      playerJoinedSound.play()
    } else if (
      message.type === CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT ||
      message.type === CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_FORFEITED
    ) {
      playerLeftSound.play()

      // Show toast notification for forfeit
      if (message.type === CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_FORFEITED) {
        toast.warning(t(message.message, { name: message.name }), {
          duration: 5000,
        })
      }
    }

    const chatMessage = {
      id: message.id,
      message: t(message.message, {
        name: message.name,
      }),
      type: message.type,
    } as ChatMessage

    setChat((prev) => [chatMessage, ...prev])
  }

  const onSystemMessageReceived = (message: SystemChatMessage) => {
    setChat((prev) => [message, ...prev])
  }

  const onWizzReceived = (targetName: string, initiatorName: string) => {
    if (targetName === name) {
      const wizzContainer = document.querySelector(".wizz-container")
      if (wizzContainer) {
        wizzContainer.classList.add("animate-wizz")
        setTimeout(() => {
          wizzContainer.classList.remove("animate-wizz")
        }, 2000)
      } else {
        console.error("Wizz container not found")
      }

      wizzSound.play()
      addSystemMessage(
        t("wizz-self", { initiatorName }),
        CoreConstants.SYSTEM_MESSAGE_TYPE.WARN_SYSTEM_MESSAGE,
      )
    } else {
      addSystemMessage(t("wizz-other", { targetName, initiatorName }))
    }
  }
  //#endregion

  const addSystemMessage = (
    message: string,
    type: SystemMessageType = CoreConstants.SYSTEM_MESSAGE_TYPE.SYSTEM_MESSAGE,
  ) => {
    const chatMessage: SystemChatMessage = {
      id: crypto.randomUUID(),
      message,
      type,
    }

    setChat((prev) => [chatMessage, ...prev])
  }

  const addUnreadMessage = (message: ChatMessage) => {
    setUnreadMessages((prev) => [message, ...prev])
    setHasUnreadMessage(true)
  }

  const clearUnreadMessages = () => setUnreadMessages([])

  //#region Mute functionality
  const mutePlayer = (name: string) => {
    if (!name) {
      addSystemMessage(
        t("argument-required", { command: "/mute" }),
        CoreConstants.SYSTEM_MESSAGE_TYPE.WARN_SYSTEM_MESSAGE,
      )
    } else if (mutedPlayers.includes(name)) {
      addSystemMessage(t("player-already-muted", { name }))
    } else {
      setMutedPlayers((prev) => [...prev, name])
      addSystemMessage(t("player-muted", { name }))
    }
  }

  const unmutePlayer = (name: string) => {
    if (!name) {
      addSystemMessage(
        t("argument-required", { command: "/unmute" }),
        CoreConstants.SYSTEM_MESSAGE_TYPE.WARN_SYSTEM_MESSAGE,
      )
    } else if (mutedPlayers.includes(name)) {
      setMutedPlayers((prev) => prev.filter((user) => user !== name))
      addSystemMessage(t("player-unmuted", { name }))
    } else {
      addSystemMessage(t("player-not-muted", { name }))
    }
  }

  const toggleMutePlayer = (name: string) => {
    setMutedPlayers((prev) =>
      prev.includes(name)
        ? prev.filter((user) => user !== name)
        : [...prev, name],
    )
  }
  //#endregion

  //#region Wizz functionality
  const wizzPlayer = (targetName: string) => {
    if (!targetName) {
      addSystemMessage(
        t("argument-required", { command: "/wizz" }),
        CoreConstants.SYSTEM_MESSAGE_TYPE.WARN_SYSTEM_MESSAGE,
      )
    }

    socket!.emit("wizz", targetName)
    addSystemMessage(t("wizz-sent", { targetName }))
  }
  //#endregion

  const contextValue = useMemo(
    () => ({
      chat,
      unreadMessages,
      hasUnreadMessage,
      setHasUnreadMessage,
      addUnreadMessage,
      clearUnreadMessages,
      setChat,
      sendMessage,
      addSystemMessage,
      mutedPlayers,
      mutePlayer,
      unmutePlayer,
      toggleMutePlayer,
      wizzPlayer,
      draftMessage,
      setDraftMessage,
      clearDraftMessage: () => setDraftMessage(""),
    }),
    [chat, unreadMessages, hasUnreadMessage, mutedPlayers, draftMessage],
  )

  return (
    <ChatContext.Provider value={contextValue}>
      <div className="wizz-container">{children}</div>
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) throw new Error("useChat must be used within a ChatProvider")
  return context
}

export default ChatProvider
