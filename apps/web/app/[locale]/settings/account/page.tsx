import { getTranslations } from "next-intl/server"
import { SettingsAccount } from "./SettingsAccount"

export default async function AccountPage() {
  const t = await getTranslations("pages.SettingsAccount")

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-black dark:text-dark-font">
          {t("title")}
        </h2>
      </div>

      <SettingsAccount />
    </div>
  )
} 