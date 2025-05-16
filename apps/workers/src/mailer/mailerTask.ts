import { ENV } from "@env"
import {
  type TransactionalLocales,
  VerifyEmail,
  getLocale,
  getVerifyEmailSubject,
} from "@skymo/transactional"
import type {
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

    const template = this.getTypedTemplate(templateName, supportedLocale)

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
  ): EmailTemplateReact<T> | null {
    const templates: Record<
      EmailTemplateName,
      EmailTemplateReact<EmailTemplateName>
    > = {
      "verify-pin": {
        from: "no-reply@skymo.online",
        subject: getVerifyEmailSubject(locale),
        react: VerifyEmail,
      },
    }
    const template = templates[templateName]

    if (!template) {
      return null
    }

    return template
  }
}
