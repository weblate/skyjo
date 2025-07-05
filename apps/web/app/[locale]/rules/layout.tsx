import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"

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

export default async function RulesLayout({
  children,
}: Readonly<RulesLayoutProps>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
