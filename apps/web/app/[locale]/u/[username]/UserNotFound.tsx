import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"

interface UserNotFoundProps {
  error: "not-found" | "unknown"
  username: string
}

export const UserNotFound = async ({ error, username }: UserNotFoundProps) => {
  const t = await getTranslations("pages.UserProfile")

  if (error === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] -translate-y-8">
        <h1 className="text-2xl font-medium text-black dark:text-dark-font mb-4">
          {t("not-found.title")}
        </h1>
        <p className="text-black/60 dark:text-dark-font/60 mb-6">
          {t("not-found.description", { username })}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">
              {t("not-found.back-to-home")}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="bg-container dark:bg-dark-container rounded-lg border-2 border-black dark:border-dark-border p-12 text-center max-w-md">
        <h1 className="text-2xl font-medium text-black dark:text-dark-font mb-4">
          {t("error.title")}
        </h1>
        <p className="text-black/60 dark:text-dark-font/60 mb-6">
          {t("error.description")}
        </p>
        <Link href="/">
          <Button className="w-full sm:w-auto">
            {t("error.back-to-home")}
          </Button>
        </Link>
      </div>
    </div>
  )
}
