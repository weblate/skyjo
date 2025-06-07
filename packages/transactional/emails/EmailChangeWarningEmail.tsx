import { createIntl } from "@formatjs/intl"
import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react"
import { BaseEmail } from "../src/components/BaseEmail.js"
import { Button } from "../src/components/Button.js"
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
    subject: "Email Address Changed on Your Skymo Account",
    preview:
      "Your email address has been changed. If this wasn't you, revert the change immediately.",
    logoAlt: "Skymo Logo",
    title: "Your email address has been changed",
    body: "We're writing to inform you that the email address for your Skymo account has been changed.",
    ignoreDisclaimer:
      " If you made this change, you can safely ignore this email.",
    newEmail: "New email address: {newEmail}",
    securityNotice:
      "If you didn't make this change, click the button below to revert this change and secure your account.",
    buttonText: "I didn't make this change",
    alternativeText:
      "If the button doesn't work, you can also copy and paste this link into your browser:",
    expiryNotice: "This link will expire in 7 days for security reasons.",
    contact:
      "If you have any concerns, you can also contact our support team at",
  },
  fr: {
    subject: "Adresse Email Modifiée sur Votre Compte Skymo",
    preview:
      "Votre adresse email a été modifiée. Si ce n'était pas vous, annulez le changement immédiatement.",
    logoAlt: "Logo Skymo",
    title: "Votre adresse email a été modifiée",
    body: "Nous vous écrivons pour vous informer que l'adresse email de votre compte Skymo a été modifiée.",
    ignoreDisclaimer:
      " Si vous avez effectué ce changement, vous pouvez ignorer cet email en toute sécurité.",
    newEmail: "Nouvelle adresse email : {newEmail}",
    securityNotice:
      "Si vous n'avez pas effectué ce changement, cliquez sur le bouton ci-dessous pour annuler ce changement et sécuriser votre compte.",
    buttonText: "Je n'ai pas effectué ce changement",
    alternativeText:
      "Vous pouvez également copier et coller ce lien dans votre navigateur :",
    expiryNotice: "Ce lien expirera dans 7 jours pour des raisons de sécurité.",
    contact:
      "Si vous avez des questions ou des préoccupations, vous pouvez contacter notre équipe de support à l'adresse suivante :",
  },
}

export const getEmailChangeWarningSubject = (locale: TransactionalLocales) => {
  return messages[locale].subject
}

export interface EmailChangeWarningContent {
  newEmail: string
  reversionUrl: string
}

type EmailChangeWarningEmailProps = DefaultProps<EmailChangeWarningContent>

export const EmailChangeWarningEmail = ({
  locale,
  content,
}: EmailChangeWarningEmailProps) => {
  const intl = createIntl({
    messages: messages[locale],
    locale,
  })

  const formatMessage = (id: string, values?: Record<string, string>) => {
    const message = intl.formatMessage({ id })
    if (!values) return message
    return Object.entries(values).reduce((acc, [key, value]) => {
      return acc.replace(`{${key}}`, value)
    }, message)
  }

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
          {intl.formatMessage({ id: "title" })}
        </Heading>

        <Text className="text-sm text-black leading-[24px] text-center mb-0">
          {intl.formatMessage({ id: "body" })}
        </Text>

        <Text className="text-sm text-black leading-[24px] text-center font-semibold mt-1">
          {formatMessage("newEmail", { newEmail: content.newEmail })}
        </Text>

        <Text className="text-sm text-black leading-[24px] text-center">
          {intl.formatMessage({ id: "securityNotice" })}
        </Text>

        <Section className="text-center mt-8 mb-8">
          <Button href={content.reversionUrl}>
            {intl.formatMessage({ id: "buttonText" })}
          </Button>
        </Section>

        <Text className="text-xs text-gray-500 leading-[24px] text-center">
          {intl.formatMessage(
            { id: "alternativeText" },
            {
              reversionUrl: content.reversionUrl,
            },
          )}{" "}
          <Link href={content.reversionUrl}>{content.reversionUrl}</Link>
        </Text>

        <Text className="text-xs text-gray-500 leading-[24px] text-center">
          {intl.formatMessage({ id: "expiryNotice" })}
        </Text>

        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

        <Text className="text-gray-500 text-xs leading-[24px] text-center">
          {intl.formatMessage({ id: "contact" })}{" "}
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
        <Footer locale={locale} />
      </>
    </BaseEmail>
  )
}

EmailChangeWarningEmail.PreviewProps = {
  locale: "en",
  content: {
    newEmail: "email@example.com",
    reversionUrl: "http://localhost:3000/revert-email/1234567890",
  },
} satisfies EmailChangeWarningEmailProps

export default EmailChangeWarningEmail
