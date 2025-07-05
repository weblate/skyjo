import { Locales } from "@skymo/shared/constants"
import { type Metadata } from "next"
import { notFound } from "next/navigation.js"
import { getTranslations } from "next-intl/server"
import ResetPasswordFormPage from "@/app/[locale]/reset-password/ResetPasswordFormPage"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"

interface ResetPasswordPageParams {
  locale: Locales
}

interface ResetPasswordPageProps {
  params: Promise<ResetPasswordPageParams>
}

export async function generateMetadata(props: ResetPasswordPageProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.ForgotPassword.head",
  })

  const currentUrl = getCurrentUrl("reset-password", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("reset-password"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: currentUrl,
    },
    twitter: {
      title: t("title"),
      description: t("description"),
    },
  }

  return metadata
}

export default async function Page() {
  return <ResetPasswordFormPage />
}
