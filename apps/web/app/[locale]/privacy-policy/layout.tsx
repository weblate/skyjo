import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface PrivacyPolicyLayoutParams {
  locale: Locales
}
export interface PrivacyPolicyLayoutProps {
  children: React.ReactNode
  params: Promise<PrivacyPolicyLayoutParams>
}

export async function generateMetadata(props: PrivacyPolicyLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.PrivacyPolicy.head",
  })

  const currentUrl = getCurrentUrl("privacy-policy", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("privacy-policy"),
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

export default async function PrivacyPolicyLayout({
  children,
}: PrivacyPolicyLayoutProps) {
  return (
    <div className="flex flex-col pt-4">
      <Navbar />
      {children}
      <Footer />
    </div>
  )
}
