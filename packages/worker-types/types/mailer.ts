import type { Locale, SignupContent } from "@skymo/transactional"

export type EmailTemplateName = "signup"

type EmailContent<T extends EmailTemplateName> = T extends "signup"
  ? SignupContent
  : never
type EmailableProps<T extends EmailTemplateName> = {
  locale: Locale
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
  locale: Locale
  content: EmailContent<T>
}

export interface EmailTemplateReact<T extends EmailTemplateName> {
  from: string
  subject: string
  react: EmailableComponent<T>
}
