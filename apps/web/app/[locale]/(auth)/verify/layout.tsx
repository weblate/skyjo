import Footer from "@/components/Footer"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { verifySession } from "@/lib/dal"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound, redirect } from "next/navigation"

interface VerifyParams {
  locale: Locales
}
export interface VerifyProps {
  children: React.ReactNode
  params: Promise<VerifyParams>
}

export async function generateMetadata(props: VerifyProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({ locale, namespace: "pages.Verify.head" })

  const currentUrl = getCurrentUrl("verify", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("verify"),
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

export default async function VerifyLayout({ children }: VerifyProps) {
  const session = await verifySession()

  if (!session) {
    redirect("/login")
  }

  if (session.emailVerified) {
    if (session.onboardingCompleted) {
      redirect("/")
    } else {
      redirect("/onboard")
    }
  }

  return (
    <>
      {children}
      <Footer />
    </>
  )
}
