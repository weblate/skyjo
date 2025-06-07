"use client"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"

interface RevertEmailPageProps {
  result: {
    success: boolean
    error: string | null
  }
}

const RevertEmailPage = ({ result }: RevertEmailPageProps) => {
  const t = useTranslations("pages.RevertEmail")

  if (result.success) {
    return (
      <div className="min-h-[80svh] w-full z-20 flex flex-col justify-center items-center gap-4">
        <div className="max-w-sm flex flex-col w-full text-center">
          <h1 className="text-2xl font-medium mb-6">{t("success.title")}</h1>
          <p className="text-gray-600 mb-6">{t("success.message")}</p>
          <p className="text-gray-600 mb-6">{t("success.close")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh w-full z-20 flex flex-col justify-center items-center gap-4">
      <div className="max-w-sm flex flex-col w-full text-center -translate-y-12">
        <h1 className="text-2xl font-medium mb-6">{t("error.title")}</h1>
        <p className="text-gray-600 mb-6">
          {result.error === "Invalid token"
            ? t("error.invalidToken")
            : result.error || "An error occurred"}
        </p>
        <Link href="/login">
          <Button className="w-full">{t("back")}</Button>
        </Link>
      </div>
    </div>
  )
}

export default RevertEmailPage
