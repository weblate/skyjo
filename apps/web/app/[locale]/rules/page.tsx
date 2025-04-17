import Rules from "@/components/Rules"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import Link from "next/link"

const RulesPage = () => {
  const t = useTranslations("pages.Rules")
  return (
    <div className="container bg-body dark:bg-dark-body my-40 text-black dark:text-dark-font">
      <Link href="/" className="flex justify-center my-6">
        <h1 className="select-none font-shantell text-4xl">Skymo</h1>
      </Link>
      <h2 className="text-3xl mt-6 mb-4">{t("title")}</h2>
      <Rules />
      <div className="flex flex-col items-center">
        <Button className="mt-8">
          <Link href="/">Jouer en ligne gratuitement !</Link>
        </Button>
      </div>
    </div>
  )
}

export default RulesPage
