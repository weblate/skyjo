import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import Image from "next/image"

const MaintenancePage = () => {
  const t = useTranslations("pages.Maintenance")

  return (
    <div className="flex flex-col items-center justify-center h-dvh gap-2 p-4">
      <span className="font-shantell text-4xl select-none absolute top-4 inset-x-0 mx-auto sm:mx-0 sm:left-4">
        Skymo
      </span>
      <h1 className="text-black dark:text-white text-4xl font-bold text-center">
        {t("title")}
      </h1>
      <p className="text-black dark:text-white text-center">
        {t("description")}
      </p>
      <Link
        href="https://github.com/maxentr/skymo"
        className="absolute bottom-4 inset-x-0 flex justify-center"
      >
        <Image
          src="/svg/github.svg"
          width={24}
          height={24}
          alt={t("github-alt")}
          className="dark:invert"
        />
      </Link>
    </div>
  )
}

export default MaintenancePage
