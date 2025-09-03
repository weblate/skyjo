import { Locales } from "@skymo/shared/constants"
import { headers } from "next/headers"
import { redirect } from "@/i18n/routing"
import { verifySession } from "@/lib/dal"

export interface AuthLayoutProps {
  children: React.ReactNode
  params: Promise<{
    locale: Locales
  }>
}

export default async function AuthLayout(props: Readonly<AuthLayoutProps>) {
  const { locale } = await props.params
  const session = await verifySession()

  // If no session, redirect to login
  if (!session) {
    redirect({ href: "/login", locale })
    return null
  }

  // Get current pathname to determine routing logic
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") || ""
  const isOnboardPage = pathname.includes("/onboard")

  // If user hasn't completed onboarding and tries to access non-onboard pages
  if (!session.onboardingCompleted && !isOnboardPage) {
    redirect({ href: "/onboard", locale })
    return null
  }

  // If user completed onboarding and tries to access onboard page
  if (session.onboardingCompleted && isOnboardPage) {
    redirect({ href: "/", locale })
    return null
  }

  return <>{props.children}</>
}
