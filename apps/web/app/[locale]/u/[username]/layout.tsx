import { UserSearch } from "@/app/[locale]/u/[username]/UserSearch"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface UserLayoutParams {
  locale: Locales
  username: string
}

export interface UserLayoutProps {
  children: React.ReactNode
  params: Promise<UserLayoutParams>
}

export async function generateMetadata(props: UserLayoutProps) {
  const { locale, username } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.UserProfile.head",
  })

  const currentUrl = getCurrentUrl(`u/${username}`, locale)

  const metadata: Metadata = {
    title: t("title", { username }),
    description: t("description", { username }),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages(`u/${username}`),
    },
    openGraph: {
      title: t("title", { username }),
      description: t("description", { username }),
      url: currentUrl,
    },
    twitter: {
      title: t("title", { username }),
      description: t("description", { username }),
    },
  }

  return metadata
}

export default async function UserLayout({
  children,
  params: _params,
}: Readonly<UserLayoutProps>) {
  return (
    <div className="min-h-screen bg-body dark:bg-dark-body">
      <Navbar />
      <main className="container mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-5xl py-8 px-4 space-y-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-end items-start">
          <UserSearch />
        </div>
        {children}
      </main>
      <Footer />
    </div>
  )
}
