import type { ChatMessage } from "@skymo/shared/types"
import { cva } from "class-variance-authority"
import { ClassValue } from "clsx"
import { m } from "motion/react"
import { useLocale, useTranslations } from "next-intl"
import { UserContextMenu } from "@/components/UserContextMenu"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"

const chatMessageClasses = cva("text-sm text-wrap break-words hyphens-auto", {
  variants: {
    type: {
      message: "text-black dark:text-dark-font",
      "player-joined": " text-green-600 ",
      "player-reconnect": " text-green-600 ",
      "player-left": " text-red-600 ",
      "player-forfeited": " text-orange-500 ",
      "host-transferred": " text-blue-500 ",
      wizz: " text-purple-600",
      "system-message": " text-blue-500 ",
      "success-system-message": " text-green-600 ",
      "warn-system-message": " text-orange-500 ",
      "error-system-message": " text-red-600 ",
    },
  },
})
type ChatMessageProps = Readonly<ChatMessage> & {
  name?: string
  className?: ClassValue
}

const ChatMessage = ({
  name,
  message,
  type,
  id,
  className,
}: ChatMessageProps) => {
  const { game, opponents } = useGame()
  const t = useTranslations("components.ChatMessage")
  const locale = useLocale()
  const players = game?.players.map((p) => p.name) ?? []

  const getOpponentByName = (name?: string) => {
    if (!name || !opponents) return null
    return opponents.flat().find((p) => p.name === name) ?? null
  }

  const highlightTags = (text: string) => {
    const parts = text.split(/(@[\w-]+)/)

    return parts.map((part) => {
      if (part.startsWith("@") && players.includes(part.slice(1))) {
        return (
          <span key={part} className="font-semibold text-blue-500">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const opponent = getOpponentByName(name)

  if (type === "message" && name && opponent) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <m.p
            initial={{
              opacity: 0.5,
              translateY: 10,
            }}
            animate={{
              opacity: 1,
              translateY: 0,
            }}
            className={cn(chatMessageClasses({ type }), className)}
            lang={locale}
          >
            <span className="font-semibold">
              {name}
              {t("separator")}
            </span>
            {highlightTags(message)}
          </m.p>
        </ContextMenuTrigger>
        <UserContextMenu player={opponent} reportMessageId={id} />
      </ContextMenu>
    )
  }

  return (
    <m.p
      initial={{
        opacity: 0.5,
        translateY: 10,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
      className={cn(chatMessageClasses({ type }), className)}
      lang={locale}
    >
      {name && (
        <span className="font-semibold">
          {name}
          {t("separator")}
        </span>
      )}
      {highlightTags(message)}
    </m.p>
  )
}

export default ChatMessage
