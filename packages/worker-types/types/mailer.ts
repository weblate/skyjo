import type { Locales, VerifyEmailContent } from "@skymo/transactional"

export type EmailTemplateName = "signup-otp"

type EmailContent<T extends EmailTemplateName> = T extends "signup-otp"
  ? VerifyEmailContent
  : never
type EmailableProps<T extends EmailTemplateName> = {
  locale: Locales
  content: EmailContent<T>
}
type EmailableComponent<T extends EmailTemplateName> = React.ComponentType<
  EmailableProps<T>
>

export interface MailerJobData<
  T extends EmailTemplateName = EmailTemplateName,
> {
  to: string
  template: T
  locale: Locales
  content: EmailContent<T>
}

export interface EmailTemplateReact<T extends EmailTemplateName> {
  from: string
  subject: string
  react: EmailableComponent<T>
}
