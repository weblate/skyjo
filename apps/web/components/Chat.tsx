"use client"

import { ClassValue } from "clsx"
import { useEffect, useState } from "react"
import { ChatDesktopView } from "@/components/ChatDesktopView"
import { ChatMobileView } from "@/components/ChatMobileView"
import { useChat } from "@/contexts/ChatContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface ChatProps {
  className?: ClassValue
}
const Chat = ({ className }: ChatProps) => {
  const { chat, setHasUnreadMessage, addUnreadMessage, clearUnreadMessages } =
    useChat()
  const {
    settings: { chatVisibility },
  } = useSettings()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const [open, setOpen] = useState(false)

  useEffect(() => clearUnreadMessages(), [])

  useEffect(() => {
    if (open === false) {
      const lastMessage = chat?.[0]

      if (lastMessage) addUnreadMessage(lastMessage)
    } else {
      clearUnreadMessages()
    }
  }, [chat])

  const toggleOpening = () => {
    const newOpenState = !open
    setOpen(newOpenState)

    if (newOpenState === true) setHasUnreadMessage(false)

    setTimeout(() => {
      if (newOpenState === false) clearUnreadMessages()
    }, 300)
  }

  if (!chatVisibility) return null

  if (isDesktop) {
    return (
      <ChatDesktopView
        className={className}
        open={open}
        toggleOpening={toggleOpening}
      />
    )
  }

  return (
    <ChatMobileView
      className={className}
      open={open}
      toggleOpening={toggleOpening}
    />
  )
}

export { Chat }
