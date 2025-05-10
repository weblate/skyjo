import { ENV } from "@env"
import { type Locale, Signup, getSignupSubject } from "@skymo/transactional"
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
    const { to, template, locale, content } = job

    const {
      from,
      subject,
      react: ActualComponent,
    } = this.getTypedTemplate(template, locale)

    await this.resend.emails.send({
      from,
      to,
      subject,
      react: createElement(ActualComponent, { locale, content }),
    })
  }

  private getTypedTemplate<T extends EmailTemplateName>(
    templateName: T,
    locale: Locale,
  ): EmailTemplateReact<T> {
    const templates = {
      signup: {
        from: "no-reply@skymo.online",
        subject: getSignupSubject(locale),
        react: Signup,
      },
    }
    return templates[templateName]
  }
}
