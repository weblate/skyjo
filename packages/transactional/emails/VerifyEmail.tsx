import { createIntl } from "@formatjs/intl"
import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react"
import { BaseEmail } from "../src/components/BaseEmail.js"
import { Footer } from "../src/components/Footer.js"
import {
  SUPPORT_EMAIL,
  type TransactionalLocales,
  WEBSITE_LOGO_URL,
  WEBSITE_URL,
} from "../src/constants.js"
import type { DefaultProps } from "../src/types.ts"

const messages: Record<TransactionalLocales, Record<string, string>> = {
  en: {
    subject: "Your verification code: [[code]]",
    preview: "Use your OTP to verify your email and start onboarding on Skymo.",
    logoAlt: "Skymo Logo",
    welcome: "Verify your email to activate your Skymo account!",
    body: "Thank you for registering on Skymo! To activate your account and start playing, please enter the one-time password (OTP) below. Once verified, you'll be redirected to your onboarding page.",
    pin: "Your verification code:",
    footer:
      "This email was sent to you by Skymo. If you did not register for the game, please contact our support team at",
  },
  fr: {
    subject: "Votre code de vérification : [[code]]",
    preview:
      "Utilisez votre code OTP pour vérifier votre email et commencer l'onboarding sur Skymo.",
    logoAlt: "Logo Skymo",
    welcome: "Vérifiez votre email pour activer votre compte Skymo !",
    body: "Merci de vous être inscrit sur Skymo ! Pour activer votre compte et commencer à jouer, veuillez saisir le code à usage unique (OTP) ci-dessous. Une fois vérifié, vous serez redirigé vers votre page d'onboarding.",
    pin: "Votre code de vérification :",
    footer:
      "Cet email vous a été envoyé par Skymo. Si vous ne vous êtes pas inscrit au jeu, veuillez en informer notre équipe d'assistance à l'adresse",
  },
}

export const getVerifyEmailSubject = (
  locale: TransactionalLocales,
  content: VerifyEmailContent,
) => {
  return messages[locale].subject.replace("[[code]]", content.pin)
}
export interface VerifyEmailContent {
  pin: string
}
type VerifyEmailProps = DefaultProps<VerifyEmailContent>
export const VerifyEmail = ({ locale, content }: VerifyEmailProps) => {
  const intl = createIntl({
    messages: messages[locale],
    locale,
  })

  return (
    <BaseEmail locale={locale} preview={intl.formatMessage({ id: "preview" })}>
      <>
        <Section className="mt-[32px]">
          <Link
            href={WEBSITE_URL}
            target="_blank"
            title={intl.formatMessage({ id: "logoAlt" })}
          >
            <Img
              src={WEBSITE_LOGO_URL}
              width="80"
              height="80"
              className="mx-auto my-0"
            />
          </Link>
        </Section>

        <Heading className="mx-0 mt-8 mb-6 p-0 text-center font-normal text-[24px] text-black">
          {intl.formatMessage({ id: "welcome" })}
        </Heading>

        <Text className="text-sm text-black leading-[24px] text-center">
          {intl.formatMessage({ id: "body" })}
        </Text>

        <Text className="text-xl text-black text-bold text-center mt-8">
          {intl.formatMessage({ id: "pin" })}
        </Text>
        <Text className="text-5xl text-black text-bold tracking-[1rem] -mr-4 text-center mb-12">
          {content.pin}
        </Text>

        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

        <Text className="text-gray-500 text-xs leading-[24px] text-center">
          {intl.formatMessage({ id: "footer" })}{" "}
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
        <Footer locale={locale} />
      </>
    </BaseEmail>
  )
}

VerifyEmail.PreviewProps = {
  locale: "en",
  content: {
    pin: "123456",
  },
} satisfies VerifyEmailProps

export default VerifyEmail
