import { Container } from "@react-email/components"
import { Body, Preview, Tailwind } from "@react-email/components"
import { Html } from "@react-email/components"
import type { ReactNode } from "react"
// biome-ignore lint/correctness/noUnusedImports: needed when using createElement
import React from "react"
import type { TransactionalLocales } from "../constants.js"

interface BaseEmailProps {
  locale: TransactionalLocales
  children: ReactNode
  preview: string
}
export const BaseEmail = ({ children, locale, preview }: BaseEmailProps) => {
  return (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              body: "#F8F7EB",
              button: "#F6E9C9",
              container: "#fefdf7",
            },
            fontFamily: {
              sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
            },
          },
        },
      }}
    >
      <Html lang={locale}>
        <Preview>{preview}</Preview>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] px-4">
            {children}
          </Container>
        </Body>
      </Html>
    </Tailwind>
  )
}
