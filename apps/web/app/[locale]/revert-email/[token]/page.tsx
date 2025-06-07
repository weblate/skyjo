import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { Locales } from "@skymo/shared/constants"
import RevertEmailPage from "./RevertEmailPage"

interface RevertEmailPageParams {
  locale: Locales
  token: string
}

interface RevertEmailPageProps {
  params: Promise<RevertEmailPageParams>
}

async function revertEmail(token: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/me/revert-email/${encodeURIComponent(token)}`,
    )

    if (!res.ok) {
      const result = await res.json()
      console.log(result)
      return { success: false, error: "Request failed" }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Email revert error:", error)
    return { success: false, error: "Network error occurred" }
  }
}

export default async function Page({ params }: RevertEmailPageProps) {
  const { token } = await params

  if (!token) {
    return (
      <RevertEmailPage result={{ success: false, error: "Invalid token" }} />
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
