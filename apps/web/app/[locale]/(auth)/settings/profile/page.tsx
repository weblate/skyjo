import { getTranslations } from "next-intl/server"
import { ProfileSection } from "./ProfileSection"

export default async function ProfileSettingsPage() {
  const t = await getTranslations("pages.SettingsProfile")

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-black dark:text-dark-font">
          {t("title")}
        </h2>
      </div>

      <ProfileSection />
    </div>
  )
}
