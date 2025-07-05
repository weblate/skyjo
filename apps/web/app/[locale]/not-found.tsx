import { useTranslations } from "next-intl"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"

const NotFoundServerPage = () => {
  const t = useTranslations("pages.NotFound")

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[80dvh] gap-2">
        <h1 className="text-4xl font-bold text-center">{t("title")}</h1>
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
