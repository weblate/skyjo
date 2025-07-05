import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { generateAlternatesLanguages, routing } from "@/i18n/routing"
import { getCurrentUrl } from "@/lib/utils"
import { Locales } from "@skymo/shared/constants"
import { Metadata } from "next"
import { notFound } from "next/navigation"

interface TermsOfServiceLayoutParams {
  locale: Locales
}
export interface TermsOfServiceLayoutProps {
  children: React.ReactNode
  params: Promise<TermsOfServiceLayoutParams>
}

export async function generateMetadata(props: TermsOfServiceLayoutProps) {
  const { locale } = await props.params
  if (!routing.locales.includes(locale)) notFound()

  const currentUrl = getCurrentUrl("terms-of-service", locale)

  const metadata: Metadata = {
    title: "Terms of Service | Skymo - Skyjo Online Card Game",
    description: "Read the Terms of Service for Skymo, the online Skyjo card game platform. Learn about user obligations, service usage, and platform policies.",
    keywords: ["Terms of Service", "Skymo", "Skyjo", "online card game", "user agreement", "platform rules"],
    alternates: {
      canonical: currentUrl,
      languages: generateAlternatesLanguages("terms-of-service"),
    },
    openGraph: {
      title: "Terms of Service | Skymo - Skyjo Online Card Game",
      description: "Read the Terms of Service for Skymo, the online Skyjo card game platform. Learn about user obligations, service usage, and platform policies.",
      url: currentUrl,
    },
    twitter: {
      title: "Terms of Service | Skymo - Skyjo Online Card Game",
      description: "Read the Terms of Service for Skymo, the online Skyjo card game platform. Learn about user obligations, service usage, and platform policies.",
    },
  }

  return metadata
}

export default async function TermsOfServiceLayout({
  children,
}: Readonly<TermsOfServiceLayoutProps>) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
} 