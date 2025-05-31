import { Locales } from "@skymo/shared/constants"

interface OnboardingParams {
  locale: Locales
}

export interface OnboardingProps {
  children: React.ReactNode
  params: Promise<OnboardingParams>
}

export default async function OnboardingLayout({ children }: OnboardingProps) {
  return children
} 