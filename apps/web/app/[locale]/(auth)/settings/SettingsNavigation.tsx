"use client"

import { KeyRoundIcon, SettingsIcon, UserIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"
import { cn } from "@/lib/utils"

export function SettingsNavigation() {
  const t = useTranslations("pages.Settings.Navigation")
  const pathname = usePathname()

  const sections = [
    {
      id: "profile",
      label: t("profile"),
      icon: UserIcon,
      href: `/settings/profile`,
    },
    {
      id: "account",
      label: t("account"),
      icon: SettingsIcon,
      href: `/settings/account`,
    },
    {
      id: "password",
      label: t("password"),
      icon: KeyRoundIcon,
      href: `/settings/password`,
    },
  ]

  return (
    <nav className="space-y-2">
      {sections.map((section) => {
        const Icon = section.icon
        const isActive = pathname === section.href

        return (
          <Link
            key={section.id}
            href={section.href}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-all duration-200",
              "hover:bg-black/5 dark:hover:bg-white/5",
              "focus-visible:outline focus-visible:outline-black focus-visible:outline-2 focus-visible:outline-offset-2 dark:focus-visible:outline-dark-border",
              isActive && "bg-gray-200 dark:bg-gray-800 font-medium",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isActive
                  ? "text-black dark:text-dark-font"
                  : "text-black/60 dark:text-dark-font/60",
              )}
            />
            <span
              className={cn(
                isActive
                  ? "text-black dark:text-dark-font"
                  : "text-black/80 dark:text-dark-font/80",
              )}
            >
              {section.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
