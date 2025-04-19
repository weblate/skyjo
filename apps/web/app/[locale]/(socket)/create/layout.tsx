import Footer from "@/components/Footer"
import { Locales, generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface CreateLayoutParams {
  locale: Locales
}
export interface CreateLayoutProps {
  readonly children: React.ReactNode
  readonly params: Promise<CreateLayoutParams>
}

export async function generateMetadata(props: CreateLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.Create.head",
  })

  const currentUrl = getCurrentUrl("create", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("create"),
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

export default async function CreateLayout({ children }: CreateLayoutProps) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
