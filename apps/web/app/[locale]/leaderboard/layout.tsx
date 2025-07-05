import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

interface LeaderboardLayoutParams {
  locale: Locales
}

interface LeaderboardLayoutProps {
  children: React.ReactNode
  params: Promise<LeaderboardLayoutParams>
}

export async function generateMetadata(props: LeaderboardLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const t = await getTranslations({
    locale,
    namespace: "pages.Leaderboard.head",
  })

  const currentUrl = getCurrentUrl("leaderboard", locale)

  const metadata: Metadata = {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(","),
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("leaderboard"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: currentUrl,
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t("title"),
        },
      ],
    },
    twitter: {
      title: t("title"),
      description: t("description"),
      card: "summary_large_image",
      images: [
        {
          url: "/twitter-image.png",
          width: 1200,
          height: 675,
          alt: t("title"),
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
  }

  return metadata
}

export default async function LeaderboardLayout({
  children,
}: Readonly<LeaderboardLayoutProps>) {
  return (
    <div className="min-h-screen bg-body dark:bg-dark-body">
      <Navbar />
      <main className="container min-h-[80dvh] mx-auto md:max-w-6xl lg:max-w-7xl pt-20 pb-16 px-4">
        {children}
      </main>
      <Footer />
    </div>
  )
} 