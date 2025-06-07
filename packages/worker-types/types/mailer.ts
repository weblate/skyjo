import type {
  AccountDeletedEmailContent,
  Locales,
  ResetPasswordEmailContent,
  TransactionalLocales,
  VerifyEmailContent,
} from "@skymo/transactional"

export type EmailTemplateName = "verify-pin" | "reset-password" | "account-deleted"

export type EmailContent<T extends EmailTemplateName> = T extends "verify-pin"
  ? VerifyEmailContent
  : T extends "reset-password"
  ? ResetPasswordEmailContent
  : T extends "account-deleted"
  ? AccountDeletedEmailContent
  : never
type EmailableProps<T extends EmailTemplateName> = {
  locale: TransactionalLocales
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
