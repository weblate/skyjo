/**
 * Email normalization utility to prevent multi-account abuse through email variations
 */

type EmailNormalizationResult = {
  normalizedEmail: string
  originalEmail: string
}

/**
 * Normalize an email address to prevent duplicate accounts through email variations
 *
 * This function handles common email alias patterns:
 * - Gmail: removes dots and plus addressing (user+test@gmail.com -> user@gmail.com)
 * - Domain normalization (googlemail.com -> gmail.com)
 * - Standard cleanup (lowercase, trim)
 *
 * @param email - The email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email provided for normalization")
  }

  // Basic cleanup: trim and lowercase
  const normalized = email.trim().toLowerCase()

  // Split email into local and domain parts
  const atIndex = normalized.lastIndexOf("@")
  if (atIndex === -1 || atIndex === 0 || atIndex === normalized.length - 1) {
    throw new Error("Invalid email format - missing @ symbol")
  }

  let localPart = normalized.substring(0, atIndex)
  let domain = normalized.substring(atIndex + 1)

  // Domain normalization
  domain = normalizeDomain(domain)

  // Local part normalization based on domain
  localPart = normalizeLocalPart(localPart, domain)

  return `${localPart}@${domain}`
}

/**
 * Normalize email with detailed result information
 */
export function normalizeEmailWithDetails(
  email: string,
): EmailNormalizationResult {
  const originalEmail = email
  const normalizedEmail = normalizeEmail(email)

  return {
    normalizedEmail,
    originalEmail,
  }
}

/**
 * Normalize the domain part of an email address
 */
function normalizeDomain(domain: string): string {
  // Gmail domain variations
  const gmailDomains = [
    "gmail.com",
    "googlemail.com",
    "googlemail.co.uk",
    "googlemail.de",
  ]

  if (gmailDomains.includes(domain)) {
    return "gmail.com"
  }

  return domain
}

/**
 * Normalize the local part based on domain-specific rules
 */
function normalizeLocalPart(localPart: string, domain: string): string {
  if (domain === "gmail.com") {
    return normalizeGmailLocalPart(localPart)
  }

  // For other domains, only remove plus addressing for now
  // This can be extended for other providers with similar features
  const plusIndex = localPart.indexOf("+")
  if (plusIndex > 0) {
    localPart = localPart.substring(0, plusIndex)
  }

  return localPart
}

/**
 * Gmail-specific local part normalization
 * - Removes all dots (periods)
 * - Removes plus addressing (everything after +)
 */
function normalizeGmailLocalPart(localPart: string): string {
  // Remove plus addressing first (everything after +)
  const plusIndex = localPart.indexOf("+")
  if (plusIndex > 0) {
    localPart = localPart.substring(0, plusIndex)
  }

  // Remove all dots from Gmail local part
  // Gmail ignores dots in the local part, so user.test@gmail.com = usertest@gmail.com
  localPart = localPart.replace(/\./g, "")

  return localPart
}

/**
 * Check if two email addresses normalize to the same value
 */
export function areEmailsEquivalent(email1: string, email2: string): boolean {
  try {
    const normalized1 = normalizeEmail(email1)
    const normalized2 = normalizeEmail(email2)
    return normalized1 === normalized2
  } catch {
    return false
  }
}

/**
 * Validate that an email is properly formatted before normalization
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false
  }

  const trimmed = email.trim()

  // Check for control characters (including newlines, tabs, etc.)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return false
  }

  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(trimmed)
}
