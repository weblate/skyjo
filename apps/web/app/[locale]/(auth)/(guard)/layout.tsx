import { requireOnboardingCompleted } from "@/lib/dal"
import { PropsWithChildren } from "react"

export default async function AuthLayout({ children }: PropsWithChildren) {
  await requireOnboardingCompleted()

  return children
}
