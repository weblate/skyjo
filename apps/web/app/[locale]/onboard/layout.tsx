import { Locales } from "@skymo/shared/constants"
import { type Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { generateAlternatesLanguages, redirect, routing } from "@/i18n/routing"
import { verifySession } from "@/lib/dal"
import { getCurrentUrl } from "@/lib/utils"

interface OnboardParams {
  locale: Locales
}
export interface OnboardProps {
  children: React.ReactNode
  params: Promise<OnboardParams>
}

export async function generateMetadata(props: OnboardProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.Onboarding.head",
  })

  const currentUrl = getCurrentUrl("onboard", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("onboard"),
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

export default async function OnboardLayout({
  children,
  params,
}: Readonly<OnboardProps>) {
  const { locale } = await params
  const session = await verifySession()

  if (!session) {
    redirect({ href: "/login", locale })
    return null
  }

  if (session.onboardingCompleted) {
    redirect({ href: "/", locale })
    return null
  }

  return children
}
