import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { Locales } from "@skymo/shared/constants"
import type { RevertEmailError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import RevertEmailPage from "./RevertEmailPage"

interface RevertEmailPageParams {
  locale: Locales
  token: string
}

interface RevertEmailPageProps {
  params: Promise<RevertEmailPageParams>
}

interface RevertEmailResult {
  success: boolean
  error: RevertEmailError | null
}

async function revertEmail(token: string): Promise<RevertEmailResult> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/me/revert-email/${token}`,
    )

    if (!res.ok) {
      const error = await jsonError<RevertEmailError>(res)
      console.log(error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Email revert error:", error)
    return { success: false, error: "revert-email-error" }
  }
}

export default async function Page({ params }: RevertEmailPageProps) {
  const { token } = await params

  if (!token) {
    return (
      <RevertEmailPage
        result={{ success: false, error: "invalid-reversion-token" }}
      />
    )
  }

  const result = await revertEmail(token)

  return (
    <div className="min-h-screen bg-body dark:bg-dark-body">
      <Navbar />
      <RevertEmailPage result={result} />
      <Footer />
    </div>
  )
}
