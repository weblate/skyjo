import { ENV } from "@env"
import {
  AccountDeletedEmail,
  AccountDeletionScheduledEmail,
  EmailChangeWarningEmail,
  ResetPasswordEmail,
  type TransactionalLocales,
  VerifyEmail,
  type VerifyEmailContent,
  getAccountDeletedEmailSubject,
  getAccountDeletionScheduledEmailSubject,
  getEmailChangeWarningSubject,
  getLocale,
  getResetPasswordEmailSubject,
  getVerifyEmailSubject,
} from "@skymo/transactional"
import type {
  EmailContent,
  EmailTemplateName,
  EmailTemplateReact,
  MailerJobData,
} from "@skymo/worker-types"
import { createElement } from "react"
import { Resend } from "resend"

export class MailerTask {
  private readonly resend: Resend

  constructor() {
    this.resend = new Resend(ENV.RESEND_API_KEY)
  }

  async sendEmail<T extends EmailTemplateName>(job: MailerJobData<T>) {
    const { to, template, locale, content } = job

    const resolvedLocale = getLocale(locale)
    const emailTemplate = this.getTypedTemplate(
      template,
      resolvedLocale,
      content,
    )

    if (!emailTemplate) {
      throw new Error(`Unknown email template: ${template}`)
    }

    const { from, subject, react } = emailTemplate

    const reactElement = createElement(react, {
      locale: resolvedLocale,
      content,
    })

    await this.resend.emails.send({
      from,
      to,
      subject,
      react: reactElement,
    })
  }

  private getTypedTemplate<T extends EmailTemplateName>(
    templateName: T,
    locale: TransactionalLocales,
    content: EmailContent<T>,
  ): EmailTemplateReact<T> | null {
    if (templateName === "verify-pin") {
      return {
        from: "Skymo <no-reply@skymo.online>",
        subject: getVerifyEmailSubject(locale, content as VerifyEmailContent),
        react: VerifyEmail,
      } as EmailTemplateReact<T>
    }

    if (templateName === "reset-password") {
      return {
        from: "Skymo <no-reply@skymo.online>",
        subject: getResetPasswordEmailSubject(locale),
        react: ResetPasswordEmail,
      } as EmailTemplateReact<T>
    }

    if (templateName === "account-deleted") {
      return {
        from: "Skymo <no-reply@skymo.online>",
        subject: getAccountDeletedEmailSubject(locale),
        react: AccountDeletedEmail,
      } as EmailTemplateReact<T>
    }

    if (templateName === "account-deletion-scheduled") {
      return {
        from: "Skymo <no-reply@skymo.online>",
        subject: getAccountDeletionScheduledEmailSubject(locale),
        react: AccountDeletionScheduledEmail,
      } as EmailTemplateReact<T>
    }

    if (templateName === "email-change-warning") {
      return {
        from: "Skymo <support@skymo.online>",
        subject: getEmailChangeWarningSubject(locale),
        react: EmailChangeWarningEmail,
      } as EmailTemplateReact<T>
    }

    return null
  }
}
