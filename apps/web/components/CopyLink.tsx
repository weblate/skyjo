"use client"

import { CheckIcon, CopyIcon, ShareIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { MouseEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getGameInviteLink } from "@/lib/utils"

interface CopyLinkProps {
  gameCode: string
}
const CopyLink = ({ gameCode }: CopyLinkProps) => {
  const t = useTranslations("components.CopyLink")

  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [interval, setInterval] = useState<NodeJS.Timeout>()

  const inviteLink = getGameInviteLink(gameCode)

  // navigator.canShare is not supported in Firefox
  const canShare = navigator?.share !== undefined

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)

    setCopied(true)
    if (copied) clearInterval(interval)
    setInterval(setTimeout(() => setCopied(false), 2000))
  }

  const shareGame = async () => {
    try {
      setShared(true)
      await navigator.share({
        title: t("share.title"),
        text: t("share.text"),
        url: inviteLink,
      })
    } catch {
    } finally {
      if (shared) clearInterval(interval)
      setInterval(setTimeout(() => setShared(false), 1000))
    }
  }

  const onClick = (e: MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select()
    copyLink()
  }

  return (
    <div className="flex flex-row items-center gap-2 w-full sm:w-fit">
      <Popover open={copied} onOpenChange={setCopied}>
        <PopoverTrigger asChild>
          <div className="flex flex-row items-center gap-2">
            <Input
              type="text"
              value={inviteLink}
              onClick={onClick}
              readOnly
              className="sm:w-[300px] select-text"
            />
            <Button
              variant="icon"
              onClick={copyLink}
              title={t("copy.button-title")}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <span className="text-sm font-medium">{t("copy.popover")}</span>
        </PopoverContent>
      </Popover>
      {canShare && (
        <TooltipProvider>
          <Tooltip defaultOpen={true}>
            <TooltipTrigger asChild>
              <Button
                variant="icon"
                onClick={shareGame}
                title={t("share.button-title")}
              >
                {shared ? <CheckIcon /> : <ShareIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("share.tooltip")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

export default CopyLink
