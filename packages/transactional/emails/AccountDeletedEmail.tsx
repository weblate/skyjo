import "dotenv/config"
import { createIntl } from "@formatjs/intl"
import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components"
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
    subject: "Your Skymo account has been deleted",
    preview:
      "Confirmation that your Skymo account has been permanently deleted.",
    logoAlt: "Skymo Logo",
    title: "Your Account Has Been Deleted",
    body: "This is to confirm that your Skymo account and all associated data have been permanently deleted as requested.",
    farewell:
      "Thank you for being a part of the Skymo community. We hope to see you again 🤧",
    feedback:
      "If you have a moment to share why you left, simply reply to this email. Your feedback is invaluable and helps us improve.",
  },
  fr: {
    subject: "Votre compte Skymo a bien été supprimé",
    preview:
      "Confirmation que votre compte Skymo a été définitivement supprimé.",
    logoAlt: "Logo Skymo",
    title: "Votre compte a été supprimé",
    body: "Nous vous confirmons que votre compte Skymo et toutes les données associées ont été définitivement supprimés, comme vous l'avez demandé.",
    farewell:
      "Merci d'avoir fait partie de la communauté Skymo. Nous espérons vous revoir un jour 🤧",
    feedback:
      "Si vous avez un moment pour nous dire pourquoi vous êtes parti, il vous suffit de répondre à cet e-mail. Vos retours sont précieux et nous aident à nous améliorer.",
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
          {intl.formatMessage({ id: "title" })}
        </Heading>

        <Text className="text-sm text-black leading-[24px] text-center">
          {intl.formatMessage({ id: "body" })}
        </Text>

        <Text className="text-sm text-black leading-[24px] mt-8 font-medium text-center">
          {intl.formatMessage({ id: "farewell" })}
        </Text>

        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

        <Text className="text-sm text-gray-500 leading-[24px] text-center">
          {intl.formatMessage({ id: "feedback" })}
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
