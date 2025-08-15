"use client"

import { Locales } from "@skymo/shared/constants"
import { useParams } from "next/navigation"
import { useState } from "react"
import { EmailInputForm } from "./EmailInputForm"
import { PinVerificationForm } from "./PinVerificationForm"

type SignupParams = {
  locale: Locales
}

type Step = "email" | "pin"

const SignupForm = () => {
  const { locale } = useParams<SignupParams>()
  const [currentStep, setCurrentStep] = useState<Step>("email")
  const [userEmail, setUserEmail] = useState("")

  const handleEmailSent = (email: string) => {
    setUserEmail(email)
    setCurrentStep("pin")
  }

  const handleGoBack = () => {
    setCurrentStep("email")
    setUserEmail("")
  }

  if (currentStep === "pin") {
    return (
      <PinVerificationForm
        email={userEmail}
        locale={locale}
        onGoBack={handleGoBack}
      />
    )
  }

  return <EmailInputForm locale={locale} onEmailSent={handleEmailSent} />
}

export default SignupForm
