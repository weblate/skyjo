import { getTranslations } from "next-intl/server"
import { SettingsPassword } from "./SettingsPassword"

export default async function PasswordPage() {
  const t = await getTranslations("pages.SettingsPassword")

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-black dark:text-dark-font">
          {t("title")}
        </h2>
      </div>

      <SettingsPassword />
    </div>
  )
}
