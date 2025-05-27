"use client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFeedback } from "@/contexts/FeedbackContext"
import { useRules } from "@/contexts/RulesContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useAuth } from "@/hooks/useAuth"
import { Link } from "@/i18n/routing"
import {
  BookOpenIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareWarningIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"

const MenuDropdown = () => {
  const { openFeedback } = useFeedback()
  const { openRules } = useRules()
  const { openSettings } = useSettings()
  const t = useTranslations("components.MenuDropdown")
  const { user, logout } = useAuth()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="icon" aria-label={t("button.aria-label")}>
          <MenuIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-52"
        side="top"
        sideOffset={8}
        align="end"
      >
        <DropdownMenuGroup>
          <div className="flex flex-col items-start px-2 py-1.5">
            <span className="text-sm font-medium">
              {user?.name ?? t("guest")}
            </span>

            {user && (
              <span className="text-sm text-gray-500">@{user.username}</span>
            )}
          </div>
          <DropdownMenuSeparator />
          {user && (
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
                <UserIcon className="mr-2 size-4" />
                <span>{t("profile")}</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={openRules}>
            <BookOpenIcon className="mr-2 size-4" />
            <span>{t("rules")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openSettings}>
            <SettingsIcon className="mr-2 size-4" />
            <span>{t("settings")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <a
              href="https://discord.gg/uSmGjhzZAE"
              target="_blank"
              className="flex flex-row items-center mr-2"
            >
              <Image
                src="/svg/discord-outline.svg"
                width={16}
                height={16}
                alt="Discord server invite icon"
                className="dark:invert mr-2"
              />
              <span>{t("discord")}</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openFeedback}>
            <MessageSquareWarningIcon className="mr-2 size-4" />
            <span>{t("feedback")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem>
              <LogOutIcon className="mr-2 size-4" />
              <button onClick={() => logout()}>{t("logout")}</button>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link
                href="/login"
                className="w-full flex items-center justify-start"
              >
                <LogInIcon className="mr-2 size-4" />
                {t("login")}
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default MenuDropdown
