import { createIntl } from "@formatjs/intl"
import { Heading, Img, Link, Section, Text } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from "react"
import { BaseEmail } from "../src/components/BaseEmail.js"
import { Footer } from "../src/components/Footer.js"
import {
  type TransactionalLocales,
  WEBSITE_LOGO_URL,
  WEBSITE_URL,
} from "../src/constants.js"
import type { DefaultProps } from "../src/types.ts"

const messages: Record<TransactionalLocales, Record<string, string>> = {
  en: {
    subject: "Sad to see you go! Your Skymo Account Has Been Deleted 👋",
    preview: "Your Skymo account has been successfully deleted as requested.",
    logoAlt: "Skymo Logo",
    welcome: "Account Deletion Confirmation",
    body: "We're writing to confirm that your Skymo account has been successfully deleted as requested. All your personal information has been removed from our systems.",
    farewell:
      "Thank you for being part of the Skymo community. We're sorry to see you go! 🙏",
  },
  fr: {
    subject: "Triste de vous voir partir ! Votre compte Skymo a été supprimé 👋",
    preview: "Votre compte Skymo a été supprimé avec succès comme demandé.",
    logoAlt: "Logo Skymo",
    welcome: "Confirmation de suppression de compte",
    body: "Nous vous écrivons pour confirmer que votre compte Skymo a été supprimé avec succès comme demandé. Toutes vos informations personnelles ont été supprimées de nos systèmes.",
    farewell:
      "Merci d'avoir fait partie de la communauté Skymo. Nous sommes désolés de vous voir partir ! 🙏",
  },
}

export const getAccountDeletedEmailSubject = (locale: TransactionalLocales) => {
  return messages[locale].subject
}

type AccountDeletedEmailProps = DefaultProps

export const AccountDeletedEmail = ({ locale }: AccountDeletedEmailProps) => {
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

        <Text className="text-sm text-black leading-[24px] mt-8 font-medium text-center">
          {intl.formatMessage({ id: "farewell" })}
        </Text>

        <Footer locale={locale} />
      </>
    </BaseEmail>
  )
}

AccountDeletedEmail.PreviewProps = {
  locale: "en",
  content: undefined,
} satisfies AccountDeletedEmailProps

export default AccountDeletedEmail
