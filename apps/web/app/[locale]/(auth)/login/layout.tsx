import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface LoginParams {
  locale: Locales
}
export interface LoginProps {
  children: React.ReactNode
  params: Promise<LoginParams>
}

export async function generateMetadata(props: LoginProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({ locale, namespace: "pages.Login.head" })

  const currentUrl = getCurrentUrl("login", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("login"),
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

export default async function LoginLayout({
  children,
  params: _params,
}: Readonly<LoginProps>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
