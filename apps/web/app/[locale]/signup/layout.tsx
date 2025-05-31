import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface ProfileParams {
  locale: Locales
}
export interface ProfileProps {
  children: React.ReactNode
  params: Promise<ProfileParams>
}

export async function generateMetadata(props: ProfileProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({ locale, namespace: "pages.Signup.head" })

  const currentUrl = getCurrentUrl("signup", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("signup"),
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

export default async function ProfileLayout({ children }: ProfileProps) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
