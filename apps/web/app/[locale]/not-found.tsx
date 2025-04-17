import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"

const NotFoundServerPage = () => {
  const t = useTranslations("pages.NotFound")

  return (
    <>
      <div className="flex flex-col items-center justify-center h-[90dvh] gap-2">
        <h1 className="font-shantell text-4xl select-none absolute top-4 inset-x-0 mx-auto sm:mx-0 sm:left-4">
          Skymo
        </h1>

        <h2 className="text-4xl font-bold text-center">{t("title")}</h2>
        <p className="text-lg text-center">{t("description")}</p>

        <Link href="/" className="mt-4" replace>
          <Button>{t("go-back-to-homepage")}</Button>
        </Link>
      </div>
      <Footer />
    </>
  )
}

export default NotFoundServerPage
