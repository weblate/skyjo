import { createIntl } from "@formatjs/intl"
import { Heading, Img, Link, Section, Text } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react"
import { BaseEmail } from "../src/components/BaseEmail.js"
import { Button } from "../src/components/Button.js"
import { Footer } from "../src/components/Footer.js"
import {
  type TransactionalLocales,
  WEBSITE_LOGO_URL,
  WEBSITE_URL,
} from "../src/constants.js"
import type { DefaultProps } from "../src/types.ts"

const messages: Record<TransactionalLocales, Record<string, string>> = {
  en: {
    subject: "Reset Your Skymo Password",
    preview: "Click the link to reset your Skymo account password.",
    logoAlt: "Skymo Logo",
    welcome: "Reset Your Password",
    body: "We received a request to reset the password for your Skymo account. Click the button below to reset your password. This link will expire in 1 hour.",
    buttonText: "Reset Password",
    noRequest:
      "If you didn't request a password reset, please ignore this email or contact support if you have concerns.",
  },
  fr: {
    subject: "Réinitialisez votre mot de passe Skymo",
    preview:
      "Cliquez sur le lien pour réinitialiser le mot de passe de votre compte Skymo.",
    logoAlt: "Logo Skymo",
    welcome: "Réinitialisez votre mot de passe",
    body: "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte Skymo. Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe. Ce lien expirera dans 1 heure.",
    buttonText: "Réinitialiser le mot de passe",
    noRequest:
      "Si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet email ou contactez le support si vous avez des préoccupations.",
  },
}

export const getResetPasswordEmailSubject = (locale: TransactionalLocales) => {
  return messages[locale].subject
}

export interface ResetPasswordEmailContent {
  resetUrl: string
}

type ResetPasswordEmailProps = DefaultProps<ResetPasswordEmailContent>

export const ResetPasswordEmail = ({
  locale,
  content,
}: ResetPasswordEmailProps) => {
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

        <Section className="text-center mt-8 mb-8">
          <Button href={content.resetUrl}>
            {intl.formatMessage({ id: "buttonText" })}
          </Button>
        </Section>

        <Text className="text-sm text-gray-500 leading-[24px] text-center">
          {intl.formatMessage({ id: "noRequest" })}
        </Text>
        <Footer locale={locale} />
      </>
    </BaseEmail>
  )
}

ResetPasswordEmail.PreviewProps = {
  locale: "en",
  content: {
    resetUrl: "https://skymo.online/reset-password/example-token",
  },
} satisfies ResetPasswordEmailProps

export default ResetPasswordEmail
