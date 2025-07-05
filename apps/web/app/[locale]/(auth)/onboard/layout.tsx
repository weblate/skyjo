import { Locales } from "@skymo/shared/constants"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"

interface OnboardingParams {
  locale: Locales
}

export interface OnboardingProps {
  children: React.ReactNode
  params: Promise<OnboardingParams>
}
export default async function OnboardingLayout({
  children,
  params: _params,
}: Readonly<OnboardingProps>) {
  const session = await verifySession()

  if (!session) {
    redirect("/login")
  }

  if (!session.emailVerified) {
    redirect("/verify")
  }

  if (session.onboardingCompleted) {
    redirect("/")
  }

  return <>{children}</>
}
