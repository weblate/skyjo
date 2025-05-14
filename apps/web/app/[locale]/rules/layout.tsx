import Footer from "@/components/Footer"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface RulesLayoutParams {
  locale: Locales
}
export interface RulesLayoutProps {
  children: React.ReactNode
  params: Promise<RulesLayoutParams>
}

export async function generateMetadata(props: RulesLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({ locale, namespace: "pages.Rules.head" })

  const currentUrl = getCurrentUrl("rules", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("rules"),
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

export default async function RulesLayout({ children }: RulesLayoutProps) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
