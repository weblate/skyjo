import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"

interface BannerProps {
  className?: ClassValue
}

const GFormLink = (chunks: React.ReactNode) => (
  <Link
    href="https://forms.gle/CM9PV9H24KMFqDrXA"
    target="_blank"
    className="underline underline-offset-2 text-blue-500 font-semibold"
  >
    {chunks}
  </Link>
)

const Banner = ({ className }: BannerProps) => {
  const t = useTranslations("components.Banner")

  return (
    <div
      className={cn(
        "px-6 py-2 bg-white dark:bg-dark-body text-black dark:text-dark-font border-b-2 border-black dark:border-dark-border flex flex-row items-center sm:justify-center gap-1",
        className,
      )}
    >
      {t.rich("title", {
        gform: GFormLink,
      })}
    </div>
  )
}

export default Banner
