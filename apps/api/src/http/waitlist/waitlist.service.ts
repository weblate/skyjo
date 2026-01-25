import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import type { Waitlist } from "@skymo/shared/validations"
import { Resend } from "resend"

const resend = new Resend(ENV.RESEND_API_KEY)

export async function addToWaitlist({ email, firstName }: Waitlist) {
  try {
    const result = await resend.contacts.create({
      audienceId: ENV.RESEND_AUDIENCE_ID,
      email,
      firstName,
      unsubscribed: false,
    })

    if (result.error) {
      Logger.error("Failed to add contact to waitlist", {
        error: result.error,
        email,
      })
      throw new Error("waitlist-subscription-failed")
    }

    Logger.info("Contact added to mobile waitlist", {
      email,
      contactId: result.data?.id,
    })

    return result.data
  } catch (error) {
    Logger.error("Error adding contact to waitlist", {
      error: error instanceof Error ? error.message : String(error),
      email,
    })
    throw error
  }
}
