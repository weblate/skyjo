import { Locales } from "@skymo/shared/constants"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import CallbackLogic from "@/app/[locale]/(auth)/auth/callback/CallbackPage"
import { routing } from "@/i18n/routing"

interface OAuthCallbackLayoutParams {
  locale: Locales
}
interface OAuthCallbackServerPageProps {
  params: Promise<OAuthCallbackLayoutParams>
}
export default async function OauthCallbackServerPage(
  props: Readonly<OAuthCallbackServerPageProps>,
) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.OAuthCallbackPage",
  })

  return (
    <>
      <CallbackLogic />
      <div className="min-h-svh w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block size-6 animate-spin rounded-full border-[3px] border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <h2 className="mt-2 text-lg font-medium">{t("title")}</h2>
        </div>
      </div>
    </>
  )
}
