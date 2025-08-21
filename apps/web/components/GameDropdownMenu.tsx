"use client"

import {
  BookOpenIcon,
  CheckIcon,
  DoorOpenIcon,
  EllipsisVerticalIcon,
  FlagIcon,
  MessageSquareWarningIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { Suspense, useState } from "react"
import ForfeitConfirmDialog from "@/components/ForfeitConfirmDialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFeedback } from "@/contexts/FeedbackContext"
import { useGame } from "@/contexts/GameContext"
import { useRules } from "@/contexts/RulesContext"
import { useSettings } from "@/contexts/SettingsContext"

const GameDropdownMenuComponent = () => {
  const { openFeedback } = useFeedback()
  const { openRules } = useRules()
  const { openSettings } = useSettings()
  const t = useTranslations("components.GameDropdownMenu")
  const tAppearance = useTranslations("components.AppearanceSelect")
  const { theme } = useTheme()
  const { updateSetting } = useSettings()
  const { actions, game, gameStatus } = useGame()
  const [showForfeitDialog, setShowForfeitDialog] = useState(false)

  const appearanceOptions = [
    { value: "system", label: tAppearance("system"), icon: MonitorIcon },
    { value: "light", label: tAppearance("light"), icon: SunIcon },
    { value: "dark", label: tAppearance("dark"), icon: MoonIcon },
  ] as const

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={t("button.aria-label")} asChild>
          <Button variant="icon" className="cursor-pointer">
            <EllipsisVerticalIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-52"
          side="top"
          sideOffset={10}
          align="end"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openRules}>
              <BookOpenIcon className="mr-2 size-4" />
              <span>{t("rules")}</span>
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PaletteIcon className="mr-2 size-4" />
                <span>{t("appearance")}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {appearanceOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => updateSetting("theme", option.value)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Icon className="mr-2 size-4" />
                        <span>{option.label}</span>
                      </div>
                      {theme === option.value && (
                        <CheckIcon className="size-4" />
                      )}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openSettings}>
              <SettingsIcon className="mr-2 size-4" />
              <span>{t("settings")}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_URL}
                target="_blank"
                className="flex flex-row items-center mr-2"
              >
                <Image
                  src="/svg/discord-outline.svg"
                  width={16}
                  height={16}
                  alt="Discord server invite icon"
                  className="dark:invert mr-2"
                  unoptimized
                />
                <span>{t("discord")}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openFeedback}>
              <MessageSquareWarningIcon className="mr-2 size-4" />
              <span>{t("feedback")}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {gameStatus.isPlaying && (
            <DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowForfeitDialog(true)}>
                <FlagIcon className="mr-2 size-4" />
                <span>{t("forfeit")}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          {game.settings.private && (
            <DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.leave(true)}>
                <DoorOpenIcon className="mr-2 size-4" />
                <span>{t("leave-game")}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ForfeitConfirmDialog
        open={showForfeitDialog}
        onOpenChange={setShowForfeitDialog}
      />
    </>
  )
}

const GameDropdownMenuSkeleton = () => (
  <div className="size-8 bg-zinc-200 rounded animate-pulse" />
)

const GameDropdownMenu = dynamic(
  () => Promise.resolve(GameDropdownMenuComponent),
  {
    ssr: false,
    loading: () => <GameDropdownMenuSkeleton />,
  },
)

const GameDropdownMenuWrapper = () => {
  return (
    <Suspense fallback={<GameDropdownMenuSkeleton />}>
      <GameDropdownMenu />
    </Suspense>
  )
}

export default GameDropdownMenuWrapper
