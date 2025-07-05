import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"
import LoginButton from "@/components/LoginButton"
import MenuDropdown from "@/components/MenuDropdown"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"

interface NavbarProps {
  className?: ClassValue
}
const Navbar = ({ className }: NavbarProps) => {
  const t = useTranslations("components.Navbar")

  return (
    <nav
      className={cn(
        "flex flex-row items-center justify-between px-4 pt-4",
        className,
      )}
    >
      <div className="flex flex-row items-center justify-start gap-8">
        <Link href="/" className="-translate-y-0.5">
          <span className="text-3xl font-shantell">Skymo</span>
        </Link>

        <div className="hidden md:flex flex-row items-center justify-start gap-6">
          <Link
            href="/rules"
            className="text-black dark:text-dark-font px-2 py-1 hover:underline underline-offset-1 hover:underline-offset-4 transition-all duration-300 ease-in-out outline-black"
          >
            {t("links.rules")}
          </Link>
          <Link
            href="/leaderboard"
            className="text-black dark:text-dark-font px-2 py-1 hover:underline underline-offset-1 hover:underline-offset-4 transition-all duration-300 ease-in-out outline-black"
          >
            {t("links.leaderboard")}
          </Link>
        </div>
      </div>

      <div className="flex flex-row items-center gap-4">
        <LoginButton />
        <MenuDropdown variant="account" />
      </div>
    </nav>
  )
}

export default Navbar
