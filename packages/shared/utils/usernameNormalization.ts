/**
 * Normalizes a username by removing accented characters and keeping only alphanumeric characters and underscores
 * This ensures the username matches the validation regex /^\w+$/
 */
export function normalizeUsername(input: string): string {
  // Normalize unicode characters to decomposed form (NFD)
  // This separates base characters from combining characters (accents)
  const normalized = input.normalize("NFD")

  // Remove combining characters (accents) using unicode range
  // \u0300-\u036f covers combining diacritical marks
  const withoutAccents = normalized.replace(/[\u0300-\u036f]/g, "")

  // Replace spaces with underscores
  const withUnderscores = withoutAccents.replace(/\s+/g, "_")

  // Keep only alphanumeric characters and underscores
  // This ensures compatibility with the /^\w+$/ regex validation
  const cleaned = withUnderscores.replace(/[^\w]/g, "")

  // Convert to lowercase for consistency
  const lowercase = cleaned.toLowerCase()

  // Ensure the result is not empty
  // If all characters were removed, return empty string to let validation handle it
  return lowercase
}
