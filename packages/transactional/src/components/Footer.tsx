import { createIntl } from "@formatjs/intl"
import { Container, Text } from "@react-email/components"
import { Hr, Img, Link } from "@react-email/components"
// biome-ignore lint/correctness/noUnusedImports: needed when using createElement
import React from "react"
import {
  DISCORD_URL,
  type TransactionalLocales,
  WEBSITE_URL,
} from "../constants.js"

const footerMessages = {
  en: {
    joinDiscord: "Join our Community on Discord!",
    discordAlt: "Discord Logo",
    copyright: "© 2025 Skymo. All rights reserved",
  },
  fr: {
    joinDiscord: "Rejoignez notre communauté sur Discord !",
    discordAlt: "Logo Discord",
    copyright: "© 2025 Skymo. Tous droits réservés",
  },
}
interface FooterProps {
  locale: TransactionalLocales
}
export const Footer = ({ locale }: FooterProps) => {
  const intl = createIntl({ messages: footerMessages[locale], locale })

  return (
    <>
      <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

      <Container>
        <Text className="text-gray-500 text-sm text-center leading-[24px] mx-auto my-0">
          {intl.formatMessage({ id: "joinDiscord" })}
        </Text>
        <Link
          href={DISCORD_URL}
          target="_blank"
          className="block w-fit mx-auto"
          title={intl.formatMessage({ id: "discordAlt" })}
        >
          <Img
            src={`${WEBSITE_URL}/mails/discord.png`}
            width="24"
            height="24"
            className="w-fit"
          />
        </Link>
      </Container>

      <Text className="text-gray-500 text-xs leading-[24px] text-center mt-[26px]">
        {intl.formatMessage({ id: "copyright" })}
      </Text>
    </>
  )
}
