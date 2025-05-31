import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface SearchLayoutParams {
  locale: Locales
}
export interface SearchLayoutProps {
  children: React.ReactNode
  params: Promise<SearchLayoutParams>
}

export async function generateMetadata(props: SearchLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.Search.head",
  })

  const currentUrl = getCurrentUrl("search", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("search"),
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

export default async function SearchLayout({ children }: SearchLayoutProps) {
  return (
    <>
      <Navbar className="mt-4" />
      <div className="relative min-h-svh w-full z-20 flex flex-col">
        <div className="w-full max-w-xl flex flex-grow self-center flex-col justify-center py-8 p-4">
          <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-2xl w-full flex flex-col gap-2 p-4 sm:p-8">
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
