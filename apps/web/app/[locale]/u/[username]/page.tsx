import { Locales } from "@skymo/shared/constants"
import { getTranslations } from "next-intl/server"
import { fetchUserProfile } from "@/app/[locale]/u/[username]/query"
import { RecentActivityList } from "@/app/[locale]/u/[username]/RecentActivity"
import { UserNotFound } from "@/app/[locale]/u/[username]/UserNotFound"
import { UserProfile } from "@/app/[locale]/u/[username]/UserProfile"

interface UserPageProps {
  params: Promise<{ locale: Locales; username: string }>
}
export default async function UserPage({ params }: Readonly<UserPageProps>) {
  const { username, locale } = await params

  const userProfile = await fetchUserProfile(username)

  if ("error" in userProfile) {
    return <UserNotFound error={userProfile.error} username={username} />
  }

  const t = await getTranslations({ locale, namespace: "pages.UserProfile" })

  return (
    <>
      <UserProfile
        user={userProfile.user}
        stats={userProfile.stats}
        locale={locale}
      />
      <div className="bg-container dark:bg-dark-container rounded-lg border-2 border-black dark:border-dark-border p-6">
        <h3 className="text-lg font-medium text-black dark:text-dark-font mb-4">
          {t("sections.achievements")}
        </h3>
        <p className="text-black/60 dark:text-dark-font/60 text-center py-8">
          {t("sections.achievements-coming-soon")}
        </p>
      </div>
      <div className="gap-6">
        <div className="bg-container dark:bg-dark-container rounded-lg border-2 border-black dark:border-dark-border p-6 mb-32">
          <h3 className="text-lg font-medium text-black dark:text-dark-font">
            {t("sections.recent-activity")}
          </h3>
          <RecentActivityList games={userProfile.games} locale={locale} />
        </div>
      </div>
    </>
  )
}
