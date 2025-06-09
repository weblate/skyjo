import { verifySession } from "@/lib/dal"
import { Locales } from "@skymo/shared/constants"
import { redirect } from "next/navigation"

interface OnboardingParams {
  locale: Locales
}

export interface OnboardingProps {
  children: React.ReactNode
  params: Promise<OnboardingParams>
}

export default async function OnboardingLayout({ children }: OnboardingProps) {
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
