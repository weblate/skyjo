import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"

interface BannerProps {
  className?: ClassValue
}

const WaitlistLink = (chunks: React.ReactNode) => (
  <Link
    href="/mobile-waitlist"
    className="underline underline-offset-2 text-blue-600"
  >
    {chunks}
  </Link>
)

const Banner = ({ className }: BannerProps) => {
  const t = useTranslations("components.Banner")

  return (
    <Link
      className={cn(
        "px-6 py-2 bg-white dark:bg-dark-body text-black dark:text-dark-font border-b-2 border-black dark:border-dark-border flex flex-col md:flex-row items-center sm:justify-center gap-1 text-center",
        className,
      )}
      href="/mobile-waitlist"
    >
      {t.rich("title", {
        link: WaitlistLink,
      })}
    </Link>
  )
}

export default Banner
