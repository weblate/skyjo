import Image from "next/image"
import { useTranslations } from "next-intl"
import { FooterFeedbackLink } from "@/components/FooterFeedbackLink"
import { FooterRulesLink } from "@/components/FooterRulesLink"
import { Link } from "@/i18n/routing"

const AvatarLink = (chunk: React.ReactNode) => (
  <a
    href={process.env.NEXT_PUBLIC_AVATAR_CREDIT_URL ?? ""}
    target="_blank"
    className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
  >
    {chunk}
  </a>
)

const Footer = () => {
  const t = useTranslations("components.Footer")

  return (
    <footer className="w-full flex flex-col gap-8 border-t-2 border-black dark:border-dark-border bg-container dark:bg-dark-container py-8">
      <div className="container grid grid-cols-1 md:grid-cols-3 grid-flow-row gap-8">
        <div className="flex flex-col justify-center items-center md:items-start gap-3 md:gap-4">
          <FooterFeedbackLink text={t("feedback")} />
          <Link
            href="/#explanation"
            className="text-black dark:text-dark-font underline"
          >
            {t("explanation")}
          </Link>
          <FooterRulesLink text={t("rules")} />
          <Link
            href={process.env.NEXT_PUBLIC_STATUS_URL ?? ""}
            target="_blank"
            className="text-black dark:text-dark-font underline"
          >
            {t("status")}
          </Link>
        </div>
        <div className="flex flex-col justify-center items-center gap-3 md:gap-4">
          <Link href="/" className="text-black dark:text-dark-font underline">
            {t("home")}
          </Link>
          <Link
            href={process.env.NEXT_PUBLIC_RELEASE_NOTES_URL ?? ""}
            target="_blank"
            className="text-black dark:text-dark-font underline"
          >
            {t("release-notes")}
          </Link>
          <Link
            href="/privacy-policy"
            className="text-black dark:text-dark-font underline"
          >
            {t("privacy-policy")}
          </Link>
        </div>
        <div className="flex flex-col justify-center items-center md:items-end gap-3 md:gap-4">
          <Link
            href={process.env.NEXT_PUBLIC_WEBLATE_URL ?? ""}
            target="_blank"
            className="text-black dark:text-dark-font underline"
          >
            {t("translations")}
          </Link>
          <Link
            href="https://magilano.com/en"
            target="_blank"
            className="text-black dark:text-dark-font underline"
          >
            {t("buy-game")}
          </Link>
          <div className="flex flex-row items-center gap-4">
            <Link
              href={process.env.NEXT_PUBLIC_DISCORD_URL ?? ""}
              target="_blank"
            >
              <Image
                src="/svg/discord.svg"
                width={24}
                height={24}
                alt="Discord server invite icon"
                className="dark:invert"
                unoptimized
              />
            </Link>
            <Link
              href={process.env.NEXT_PUBLIC_GITHUB_URL ?? ""}
              target="_blank"
            >
              <Image
                src="/svg/github.svg"
                width={24}
                height={24}
                alt="github.com/Maxentr"
                className="dark:invert"
                unoptimized
              />
            </Link>
          </div>
        </div>
      </div>
      <div className="container flex flex-col gap-2">
        <p className="text-center text-black dark:text-dark-font text-sm">
          {t("disclaimer.not-affiliated")}
        </p>
        <p className="text-center text-black dark:text-dark-font text-sm">
          {t("disclaimer.rights-owned")}
        </p>
        <p className="text-center text-black dark:text-dark-font text-sm">
          {t("disclaimer.responsible-content")}
        </p>
        <p className="text-center text-black dark:text-dark-font text-sm">
          {t.rich("attribution.avatars", { link: AvatarLink })}
        </p>
      </div>
    </footer>
  )
}

export default Footer
