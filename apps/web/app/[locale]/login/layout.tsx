import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, redirect, routing } from "@/i18n/routing"
import { verifySession } from "@/lib/dal"
import { getCurrentUrl } from "@/lib/utils"

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
  params,
}: Readonly<LoginProps>) {
  const { locale } = await params
  const session = await verifySession()

  // If user has a valid session, redirect based on onboarding status
  if (session) {
    if (!session.onboardingCompleted) {
      redirect({ href: "/onboard", locale })
      return null
    } else {
      redirect({ href: "/", locale })
      return null
    }
  }

  // No session - show login page
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
