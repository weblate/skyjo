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

  if (!session) {
    redirect({ href: "/login", locale })
    return null
  }

  if (session.onboardingCompleted) {
    return props.children
  }

  redirect({ href: "/onboard", locale })
  return null
}
