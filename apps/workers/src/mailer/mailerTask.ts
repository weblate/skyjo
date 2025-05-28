import { ENV } from "@env"
import {
  ResetPasswordEmail,
  type TransactionalLocales,
  VerifyEmail,
  type VerifyEmailContent,
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
    const { to, template: templateName, locale: userLocale, content } = job

    const supportedLocale = getLocale(userLocale)

    const template = this.getTypedTemplate(
      templateName,
      supportedLocale,
      content,
    )

    if (!template) return

    await this.resend.emails.send({
      from: template.from,
      to,
      subject: template.subject,
      react: createElement(template.react, {
        locale: supportedLocale,
        content,
      }),
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

    return null
  }
}
