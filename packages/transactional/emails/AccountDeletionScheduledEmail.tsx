import "dotenv/config"
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
    subject: "Your Skymo Account Is Scheduled for Deletion (48h to Cancel)",
    preview:
      "Your Skymo account will be deleted in 48 hours unless you cancel. Click to keep your account.",
    logoAlt: "Skymo Logo",
    title: "Your Account Deletion Is Scheduled",
    body: "We received a request to delete your Skymo account. Your account will remain accessible for the next 48 hours. If you do nothing, it will be permanently deleted after this period.",
    cancelText:
      "Changed your mind? Click the button below to cancel the deletion and keep your account.",
    buttonText: "Keep My Account",
    alternativeText:
      "If the button doesn't work, copy and paste this link into your browser.",
    contact: "Need help or have questions? Contact our support team at",
  },
  fr: {
    subject: "Suppression de votre compte Skymo programmée",
    preview:
      "Votre compte Skymo sera supprimé dans 48h sauf si vous annulez. Cliquez pour conserver votre compte.",
    logoAlt: "Logo Skymo",
    title: "Suppression de votre compte programmée",
    body: "Nous avons reçu une demande de suppression de votre compte Skymo. Votre compte restera accessible pendant 48 heures. Sans action de votre part, il sera définitivement supprimé à l'issue de ce délai.",
    cancelText:
      "Vous avez changé d'avis ? Cliquez sur le bouton ci-dessous pour annuler la suppression et garder votre compte.",
    buttonText: "Conserver mon compte",
    alternativeText:
      "Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :",
    contact:
      "Besoin d'aide ou des questions ? Contactez notre support à l'adresse",
  },
}

export const getAccountDeletionScheduledEmailSubject = (
  locale: TransactionalLocales,
) => {
  return messages[locale].subject
}

export interface AccountDeletionScheduledContent {
  cancellationUrl: string
}

export interface AccountDeletionScheduledEmailProps
  extends DefaultProps<AccountDeletionScheduledContent> {}

export const AccountDeletionScheduledEmail = ({
  locale,
  content,
}: AccountDeletionScheduledEmailProps) => {
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

        <Text className="text-sm text-black leading-[24px] text-center mt-6">
          {intl.formatMessage({ id: "cancelText" })}
        </Text>

        <Section className="text-center mt-6 mb-10">
          <Button href={content.cancellationUrl}>
            {intl.formatMessage({ id: "buttonText" })}
          </Button>
        </Section>

        <Text className="text-xs text-gray-500 leading-[24px] text-center mb-0">
          {intl.formatMessage({ id: "alternativeText" })}
        </Text>
        <Text className="text-xs text-gray-500 leading-[24px] text-center mt-0 mb-4">
          <Link href={content.cancellationUrl}>{content.cancellationUrl}</Link>
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

AccountDeletionScheduledEmail.PreviewProps = {
  locale: "en",
  content: {
    cancellationUrl: `${WEBSITE_URL}/cancel-account-deletion/example-token`,
  },
} satisfies AccountDeletionScheduledEmailProps

export default AccountDeletionScheduledEmail
