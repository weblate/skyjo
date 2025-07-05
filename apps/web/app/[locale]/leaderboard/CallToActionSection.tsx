"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { Link } from "@/i18n/routing"

export default function CallToActionSection() {
  const { isAuthenticated, isLoading } = useAuth()
  const t = useTranslations("pages.Leaderboard")

  if (isLoading) {
    return (
      <div className="mt-20 text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-black dark:border-dark-border rounded-lg p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-64 mx-auto mb-4"></div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-20 text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-black dark:border-dark-border rounded-lg p-8">
      <h3 className="text-xl font-semibold text-black dark:text-dark-font mb-2">
        {isAuthenticated
          ? t("callToAction.authenticated.title")
          : t("callToAction.guest.title")}
      </h3>
      <p className="text-muted-foreground mb-4">
        {isAuthenticated
          ? t("callToAction.authenticated.description")
          : t("callToAction.guest.description")}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {isAuthenticated ? (
          <>
            <Link href="/create">
              <Button className="min-w-[140px]">
                {t("callToAction.authenticated.createGame")}
              </Button>
            </Link>
            <Link href="/search">
              <Button className="min-w-[140px] border-2 border-black dark:border-dark-border">
                {t("callToAction.authenticated.joinGame")}
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/signup">
            <Button className="min-w-[140px]">
              {t("callToAction.guest.signup")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
