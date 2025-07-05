import { CancelAccountDeletionError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { CheckCircle, XCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"

type CancelAccountDeletionResult = {
  success: boolean
  error: CancelAccountDeletionError | null
}

async function cancelAccountDeletion(
  token: string,
): Promise<CancelAccountDeletionResult> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/me/cancel-deletion/${token}`,
      {
        method: "POST",
      },
    )

    if (!res.ok) {
      const error = await jsonError<CancelAccountDeletionError>(res)
      return {
        success: false,
        error,
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error("Account deletion cancellation error:", error)
    return {
      success: false,
      error: "cancel-account-deletion-error",
    }
  }
}

interface CancelAccountDeletionPageProps {
  params: Promise<{
    locale: string
    token: string
  }>
}
export default async function CancelAccountDeletionPage({
  params,
}: Readonly<CancelAccountDeletionPageProps>) {
  const { token } = await params
  const t = await getTranslations("pages.CancelAccountDeletion")
  const tErrors = await getTranslations("errors")

  const result = await cancelAccountDeletion(token)

  const getIcon = () => {
    if (result.success) {
      return <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
    } else if (result.error?.includes("expired")) {
      return <XCircle className="h-16 w-16 text-red-500 mx-auto" />
    } else {
      return <XCircle className="h-16 w-16 text-red-500 mx-auto" />
    }
  }

  const getTitle = () => {
    if (result.success) {
      return t("success.title")
    } else if (result.error?.includes("expired")) {
      return t("expired.title")
    } else {
      return t("failed.title")
    }
  }

  const getDescription = () => {
    if (result.success) {
      return t("success.description")
    } else if (result.error?.includes("expired")) {
      return t("expired.description")
    } else {
      return result.error ?? t("failed.description")
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full flex items-center justify-center bg-body dark:bg-dark-body px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-6 bg-container dark:bg-dark-container p-8 rounded-lg shadow-sm">
            {getIcon()}

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-font">
                {getTitle()}
              </h1>
              <p className="text-gray-600 dark:text-dark-font/80">
                {getDescription()}
              </p>
            </div>

            {result.success && (
              <div className="space-y-4">
                <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  {t("success.secure-message")}
                </p>
                <Link href="/">
                  <Button className="w-full">
                    {t("actions.return-homepage")}
                  </Button>
                </Link>
              </div>
            )}

            {result.error && (
              <div className="space-y-4">
                <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  {tErrors(result.error)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
