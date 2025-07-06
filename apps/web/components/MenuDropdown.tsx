"use client"

import { Locales } from "@skymo/shared/constants"
import {
  BookOpenIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  GlobeIcon,
  LogOutIcon,
  MessageSquareWarningIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  SettingsIcon,
  SunIcon,
  UserCog2Icon,
} from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { Suspense } from "react"
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
import { useRules } from "@/contexts/RulesContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useAuth } from "@/hooks/useAuth"
import { Link, routing, usePathname, useRouter } from "@/i18n/routing"

interface MenuDropdownProps {
  variant: "account" | "game"
}

const MenuDropdownComponent = ({ variant = "account" }: MenuDropdownProps) => {
  const { openFeedback } = useFeedback()
  const { openRules } = useRules()
  const { openSettings } = useSettings()
  const t = useTranslations("components.MenuDropdown")
  const tAppearance = useTranslations("components.AppearanceSelect")
  const tLanguage = useTranslations("components.LanguageCombobox")
  const { user, logout } = useAuth()
  const tAvatar = useTranslations("utils.avatar")
  const { theme, setTheme } = useTheme()
  const { updateSetting, settings } = useSettings()
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams()

  const updateLocale = (locale: Locales) => {
    updateSetting("locale", locale)

    let route = pathname
    const gameCode = query.get("gameCode")
    if (gameCode) route += `?gameCode=${gameCode}`

    router.replace(route, { locale })
  }

  const appearanceOptions = [
    { value: "system", label: tAppearance("system"), icon: MonitorIcon },
    { value: "light", label: tAppearance("light"), icon: SunIcon },
    { value: "dark", label: tAppearance("dark"), icon: MoonIcon },
  ]

  const languageOptions = routing.locales.map((locale) => ({
    value: locale,
    label: tLanguage(`locale.${locale}`),
  }))

  return (
    <DropdownMenu>
      {variant === "account" && (
        <DropdownMenuTrigger aria-label={t("button.aria-label")} asChild>
          {user ? (
            <button className="w-fit flex flex-row items-center gap-2 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-[6px] rounded-md transition-all duration-100 ease-in-out cursor-pointer">
              <p>{user.name}</p>
              <Image
                src={`/avatars/${user.avatar}.svg`}
                width={36}
                height={36}
                alt={user.avatar ? tAvatar(user.avatar) : t("guest")}
                className="select-none dark:opacity-90"
                title={user.name ?? t("guest")}
                priority
              />
            </button>
          ) : (
            <button className="size-8 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-1 rounded-md transition-all duration-100 ease-in-out flex items-center justify-center cursor-pointer">
              <EllipsisVerticalIcon className="size-6" />
            </button>
          )}
        </DropdownMenuTrigger>
      )}
      {variant === "game" && (
        <DropdownMenuTrigger aria-label={t("button.aria-label")} asChild>
          <Button variant="icon" className="cursor-pointer">
            <EllipsisVerticalIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        className="w-52"
        side="top"
        sideOffset={10}
        align="end"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuGroup>
          {variant === "account" && user && (
            <>
              <DropdownMenuItem>
                <Link
                  href={`/u/${user.username}`}
                  className="flex flex-col w-full"
                >
                  <span className="text-sm font-medium text-left">
                    {user?.name}
                  </span>

                  <span className="text-sm text-gray-500 text-left">
                    @{user?.username}
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

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
                    onClick={() => setTheme(option.value)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Icon className="mr-2 size-4" />
                      <span>{option.label}</span>
                    </div>
                    {theme === option.value && <CheckIcon className="size-4" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={variant === "game"}>
              <GlobeIcon className="mr-2 size-4" />
              <span>{t("language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {languageOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updateLocale(option.value)}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {settings.locale === option.value && (
                    <CheckIcon className="size-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={openSettings}>
            <SettingsIcon className="mr-2 size-4" />
            <span>{user ? t("game-settings") : t("settings")}</span>
          </DropdownMenuItem>
          {user && variant === "account" && (
            <DropdownMenuItem>
              <Link
                href="/settings/profile"
                className="flex items-center w-full"
              >
                <UserCog2Icon className="mr-2 size-4" />
                <span>{t("account-settings")}</span>
              </Link>
            </DropdownMenuItem>
          )}
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
        {variant === "account" && user && (
          <DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOutIcon className="mr-2 size-4" />
              <span>{t("logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const MenuDropdownSkeleton = () => (
  <button className="w-fit flex flex-row items-center gap-2">
    <div className="bg-zinc-200 rounded-lg animate-pulse w-16 h-5" />
    <div className="bg-zinc-200 rounded-full animate-pulse size-9" />
  </button>
)

const MenuDropdown = dynamic(() => Promise.resolve(MenuDropdownComponent), {
  ssr: false,
  loading: () => <MenuDropdownSkeleton />,
})

const MenuDropdownWrapper = (props: MenuDropdownProps) => {
  return (
    <Suspense fallback={<MenuDropdownSkeleton />}>
      <MenuDropdown {...props} />
    </Suspense>
  )
}

export default MenuDropdownWrapper
