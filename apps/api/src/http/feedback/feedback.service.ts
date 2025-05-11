import { ENV } from "@env"
import { CError } from "@skymo/error"
import type { Feedback } from "@skymo/shared/validations"
import { createTransport } from "nodemailer"
import type { Options } from "nodemailer/lib/mailer/index.js"

const mailer = createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: ENV.GMAIL_EMAIL,
    pass: ENV.GMAIL_APP_PASSWORD,
  },
})

export function sendFeedback({ email, message }: Feedback) {
  const sender = email ? `email: ${email}` : "anonymous"

  const mailOptions: Options = {
    from: ENV.GMAIL_EMAIL,
    to: ENV.GMAIL_EMAIL,
    subject: `[SKYJO feedback] - ${sender}`,
    text: message,
  }

  mailer.sendMail(mailOptions, (error) => {
    if (error) {
      throw new CError("Error while sending feedback", {
        meta: {
          email,
          message,
          error,
        },
      })
    }
  })

  return true
}
