import { ENV } from "@env"
import { Logger } from "@skymo/logger"
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
    Logger.error("Error to feedback email in queue:", { error })
  })
}
