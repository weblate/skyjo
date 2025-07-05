import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { Separator } from "@/components/ui/separator"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { SettingsNavigation } from "./SettingsNavigation"

interface SettingsLayoutParams {
  locale: Locales
}

export interface SettingsLayoutProps {
  children: React.ReactNode
  params: Promise<SettingsLayoutParams>
}
export async function generateMetadata(props: SettingsLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.Settings.head",
  })

  const currentUrl = getCurrentUrl("settings", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("settings"),
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

export default async function SettingsLayout({
  children,
  params: _params,
}: Readonly<SettingsLayoutProps>) {
  const t = await getTranslations("pages.Settings")

  return (
    <div className="min-h-screen bg-body dark:bg-dark-body">
      <Navbar />
      <main className="container mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl pt-20 pb-48 px-4">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-black dark:text-dark-font">
              {t("title")}
            </h1>
            <p className="text-black/60 dark:text-dark-font/60">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-64 flex-shrink-0">
              <div className="sticky top-8 bg-container dark:bg-dark-container border-2 border-black dark:border-white rounded-md p-2">
                <SettingsNavigation />
              </div>
            </div>

            <div className="hidden lg:block">
              <Separator orientation="vertical" className="h-full" />
            </div>

            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
