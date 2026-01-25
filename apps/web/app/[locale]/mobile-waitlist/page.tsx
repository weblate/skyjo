import { Locales } from "@skymo/shared/constants"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { MobileWaitlistForm } from "./MobileWaitlistForm"

interface MobileWaitlistPageProps {
  params: Promise<{ locale: Locales }>
}

export default async function MobileWaitlistPage({
  params,
}: Readonly<MobileWaitlistPageProps>) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "pages.MobileWaitlist" })

  return (
    <div className="mt-12 h-[70dvh]">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-dark-font">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Platforms Section */}
      <div className="flex justify-center gap-4 mt-6 mb-10">
        <div className="flex items-center gap-2 px-4 py-2 bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-full">
          <Image
            src="/svg/apple.svg"
            alt="Apple logo"
            className="dark:invert -translate-y-0.5"
            width={24}
            height={24}
          />
          <span className="font-medium text-black dark:text-dark-font">
            iOS
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-full">
          <Image
            src="/svg/android.svg"
            alt="Android logo"
            width={24}
            height={24}
          />
          <span className="font-medium text-black dark:text-dark-font">
            Android
          </span>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-lg mx-auto">
        <MobileWaitlistForm />
      </div>
    </div>
  )
}
