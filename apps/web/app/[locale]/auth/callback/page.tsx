import CallbackLogic from "@/app/[locale]/auth/callback/CallbackPage"
import { routing } from "@/i18n/routing"
import { Locales } from "@skymo/shared/constants"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface OAuthCallbackLayoutParams {
  locale: Locales
}
type OAuthCallbackServerPageProps = {
  params: Promise<OAuthCallbackLayoutParams>
}
export default async function OauthCallbackServerPage(
  props: OAuthCallbackServerPageProps,
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
