import { Locales } from "@skymo/shared/constants"
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

  // If user hasn't completed onboarding, redirect to onboard page
  if (!session.onboardingCompleted) {
    redirect({ href: "/onboard", locale })
    return null
  }

  return <>{props.children}</>
}
