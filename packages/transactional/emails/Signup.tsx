import { createIntl } from "@formatjs/intl"
import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components"
import BaseEmail from "components/BaseEmail.js"
import Button from "components/Button.js"
import Footer from "components/Footer.js"
import {
  type Locale,
  SUPPORT_EMAIL,
  WEBSITE_LOGO_URL,
  WEBSITE_URL,
} from "contants.js"
import type { DefaultProps } from "types.js"

const messages: Record<Locale, Record<string, string>> = {
  en: {
    preview: "Welcome to Skymo! Verify your email to join a game!",
    logoAlt: "Skymo Logo",
    welcome: "Welcome to the Skymo Arena!",
    salutation: "Greetings, {username}!",
    body: "Thanks for joining the Skymo tables! To deal yourself in and start playing, please verify your email address by clicking the button below. Let the games begin!",
    verify: "Verify & Play!",
    footer:
      "This email was dealt to you by Skymo. If you didn't sign up for the game, please let our support team know at",
  },
  fr: {
    preview:
      "Bienvenue sur Skymo ! Vérifiez votre email pour rejoindre une partie !",
    logoAlt: "Logo Skymo",
    welcome: "Bienvenue dans l'Arène Skymo !",
    salutation: "Salutations, {username} !",
    body: "Merci d'avoir rejoint les tables de Skymo ! Pour vous faire une place et commencer à jouer, veuillez vérifier votre adresse e-mail en cliquant sur le bouton ci-dessous. Que la partie commence !",
    verify: "Vérifier & Jouer !",
    footer:
      "Cet email vous a été envoyé par Skymo. Si vous ne vous êtes pas inscrit au jeu, veuillez en informer notre équipe d'assistance à l'adresse",
  },
}

export interface SignupContent {
  username: string
  email: string
  token: string
}
type SignupProps = DefaultProps<SignupContent>
const Signup = ({ locale, content }: SignupProps) => {
  const intl = createIntl({ messages: messages[locale], locale })

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
              width="40"
              height="37"
              className="mx-auto my-0"
            />
          </Link>
        </Section>

        <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
          {intl.formatMessage({ id: "welcome" })}
        </Heading>

        <Text className="text-[14px] text-black leading-[24px]">
          {intl.formatMessage(
            { id: "salutation" },
            { username: content.username },
          )}
          ,
        </Text>

        <Text className="text-[14px] text-black leading-[24px]">
          {intl.formatMessage({ id: "body" })}
        </Text>

        <Section className="mt-[32px] mb-[32px] text-center">
          <Button
            className="rounded-md bg-button px-12 py-2 inline-flex items-center justify-center text-center font-medium text-[12px] text-black border-2 border-solid border-black border-r-[5px] border-b-[5px] no-underline"
            href={`${WEBSITE_URL}/verify?email=${content.email}&token=${content.token}`}
          >
            {intl.formatMessage({ id: "verify" })}
          </Button>
        </Section>

        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

        <Text className="text-[#666666] text-[12px] leading-[24px]">
          {intl.formatMessage({ id: "footer" })}{" "}
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
        <Footer locale={locale} />
      </>
    </BaseEmail>
  )
}

Signup.PreviewProps = {
  locale: "en",
  content: {
    username: "John Doe",
    email: "john.doe@example.com",
    token: "1234567890",
  },
} as SignupProps

export default Signup
