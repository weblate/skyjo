import Link from "next/link"
import { useTranslations } from "next-intl"
import Rules from "@/components/Rules"
import { Button } from "@/components/ui/button"

const RulesPage = () => {
  const t = useTranslations("pages.Rules")

  return (
    <div className="container max-w-4xl mt-32 mb-56 bg-body dark:bg-dark-body text-black dark:text-dark-font">
      <h1 className="text-3xl text-center mb-12">{t("title")}</h1>
      <Rules />
      <div className="flex flex-col items-center">
        <Button className="mt-8">
          <Link href="/">{t("play-button")}</Link>
        </Button>
      </div>
    </div>
  )
}

export default RulesPage
