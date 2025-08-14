import { ENV } from "@env"
import { Logger } from "@skymo/logger"

/**
 * Trusted email domains that are known to NOT be disposable/temporary email services.
 * We skip API checks for these domains to reduce API usage and improve performance.
 */
const TRUSTED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "hotmail.co.uk",
  "yahoo.com",
  "yahoo.fr",
  "yahoo.co.uk",
  "yahoo.de",
  "yahoo.es",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "bbox.fr",
  "live.fr",
])

/**
 * Known disposable/temporary email domains that should be blocked.
 * This blacklist contains the most common disposable email providers.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Most common disposable email providers
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.org",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailinator2.com",
  "safetymail.info",
  "sogetthis.com",
  "spamherelots.com",
  "thisisnotmyrealemail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "dispostable.com",
  "throwaway.email",
  "mohmal.com",
  "emailondeck.com",
  "tempail.com",
  "20minutemail.com",
  "getnada.com",
  "tempinbox.com",
  "maildrop.cc",
  "mailnesia.com",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "trashmail.org",
  "trashmail.ws",
  "fakeinbox.com",
  "spambox.us",
  "tempemail.com",
  "tempemail.net",
  "tempr.email",
  "disposablemail.com",
  "throwawaymail.com",
  "mailcatch.com",
  "mytrashmail.com",
  "spamdecoy.net",
  "spamfree24.org",
  "spamfree24.de",
  "spamfree24.com",
  "emailias.com",
  "sneakemail.com",
  "spamgourmet.com",
  "incognitomail.org",
  "tempinbox.net",
  "anonbox.net",
  "kasmail.com",
  "spamhole.com",
  "mailexpire.com",
  "thankyou2010.com",
  "trash2009.com",
  "mytrashmail.com",
  "mailmetrash.com",
  "trbvm.com",
  "klzlk.com",
  "qiott.com",
  "tmail.ws",
  "discard.email",
  "spamburner.com",
  "tempmailaddress.com",
  "emailtemporaneo.com",
  "correo-temporal.com",
  "temporal-email.com",
  "correo.us",
  "burnermail.io",
  "mintmail.biz",
  "luxusmail.org",
  "emlhub.com",
  "10mail.org",
  "emailfake.com",
  "harakirimail.com",
  "anonymousemail.me",
  "correofalso.com",
  "eelmail.com",
  "emailwarden.com",
  "fake-mail.cf",
  "fake-mail.ga",
  "fake-mail.ml",
  "fake-mail.tk",
  "fakemail.net",
  "tempemails.com",
  "tempmails.net",
  "disposable-email.ml",
  "disposable.cf",
  "disposable.ga",
  "disposable.ml",
  "disposable.tk",
  "temporary-email.com",
  "temporary-mail.com",
  "temporary-mail.net",
  "temp-email.com",
  "temp-email.net",
  "temp-email.org",
  "tempemails.net",
  "tempmails.org",
])

/**
 * Response from the istempmail.com API
 */
interface TempMailApiResponse {
  name: string
  blocked: boolean
  unresolvable?: boolean
}

/**
 * Result of the disposable email check
 */
export interface DisposableEmailCheckResult {
  isDisposable: boolean
  domain: string
  isUnresolvable?: boolean
  error?: string
}

/**
 * Cache for API responses to avoid repeated calls for the same domain
 * Entries expire after 1 hour
 */
const domainCheckCache = new Map<
  string,
  { result: DisposableEmailCheckResult; expiresAt: number }
>()
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

/**
 * Check if an email address is from a disposable/temporary email service
 *
 * @param email - The email address to check
 * @returns Result indicating if the email is disposable
 */
export async function checkDisposableEmail(
  email: string,
): Promise<DisposableEmailCheckResult> {
  try {
    // Extract domain from email
    const domain = email.toLowerCase().split("@")[1]
    if (!domain) {
      return {
        isDisposable: false,
        domain: "",
        error: "Invalid email format",
      }
    }

    // Check if domain is in trusted list
    if (TRUSTED_EMAIL_DOMAINS.has(domain)) {
      return {
        isDisposable: false,
        domain,
      }
    }

    // Check if domain is in blacklist
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return {
        isDisposable: true,
        domain,
      }
    }

    // Check cache
    const cached = domainCheckCache.get(domain)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result
    }

    // Call istempmail.com API with domain only
    const apiUrl = `https://www.istempmail.com/api/check/${ENV.TEMP_MAIL_API_KEY}/${encodeURIComponent(domain)}`

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`)
      }

      const data = (await response.json()) as TempMailApiResponse

      const result: DisposableEmailCheckResult = {
        isDisposable: data.blocked,
        domain: data.name,
        isUnresolvable: data.unresolvable,
      }

      // Cache the result
      domainCheckCache.set(domain, {
        result,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      })

      // Clean up old cache entries periodically
      if (domainCheckCache.size > 1000) {
        const now = Date.now()
        for (const [key, value] of domainCheckCache.entries()) {
          if (value.expiresAt < now) {
            domainCheckCache.delete(key)
          }
        }
      }

      return result
    } catch (apiError) {
      // Log the error but don't block registration
      Logger.error("Failed to check disposable email via API", {
        email,
        domain,
        error: apiError instanceof Error ? apiError.message : "Unknown error",
      })

      // Return non-disposable on API failure to avoid blocking legitimate users
      return {
        isDisposable: false,
        domain,
        error: "API check failed",
      }
    }
  } catch (error) {
    Logger.error("Error in checkDisposableEmail", {
      email,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    return {
      isDisposable: false,
      domain: "",
      error: "Internal error",
    }
  }
}

/**
 * Validate if an email should be blocked based on disposable email check
 *
 * @param email - The email address to validate
 * @returns true if email is valid (not disposable), false if it should be blocked
 */
export async function isEmailValid(email: string): Promise<boolean> {
  if (ENV.NODE_ENV === "development") return true

  const result = await checkDisposableEmail(email)

  // Block if email is disposable or unresolvable
  if (result.isDisposable || result.isUnresolvable) {
    Logger.warn("Blocked disposable or unresolvable email", {
      email,
      domain: result.domain,
      isDisposable: result.isDisposable,
      isUnresolvable: result.isUnresolvable,
    })
    return false
  }

  return true
}
