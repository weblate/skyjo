import { describe, expect, test } from "vitest"
import {
  areEmailsEquivalent,
  normalizeEmail,
  normalizeEmailWithDetails,
} from "../emailNormalization.js"

describe("Email Normalization", () => {
  describe("normalizeEmail", () => {
    test("basic email normalization - lowercase and trim", () => {
      expect(normalizeEmail("  USER@EXAMPLE.COM  ")).toBe("user@example.com")
      expect(normalizeEmail("Test.User@Example.Com")).toBe(
        "test.user@example.com",
      )
      expect(normalizeEmail("\n\tuser@domain.org\t\n")).toBe("user@domain.org")
    })

    test("Gmail alias removal - plus addressing", () => {
      expect(normalizeEmail("user+test@gmail.com")).toBe("user@gmail.com")
      expect(normalizeEmail("john.doe+newsletter@gmail.com")).toBe(
        "johndoe@gmail.com",
      )
      expect(normalizeEmail("user+multiple+tags@gmail.com")).toBe(
        "user@gmail.com",
      )
      expect(normalizeEmail("test+123+abc@gmail.com")).toBe("test@gmail.com")
    })

    test("Gmail dot removal", () => {
      expect(normalizeEmail("u.s.e.r@gmail.com")).toBe("user@gmail.com")
      expect(normalizeEmail("john.doe@gmail.com")).toBe("johndoe@gmail.com")
      expect(normalizeEmail("test.email.address@gmail.com")).toBe(
        "testemailaddress@gmail.com",
      )
      expect(normalizeEmail("a.b.c.d.e.f@gmail.com")).toBe("abcdef@gmail.com")
    })

    test("Gmail combined: dots and plus addressing", () => {
      expect(normalizeEmail("u.s.e.r+test@gmail.com")).toBe("user@gmail.com")
      expect(normalizeEmail("john.doe+newsletter@gmail.com")).toBe(
        "johndoe@gmail.com",
      )
      expect(normalizeEmail("test.user+123+abc@gmail.com")).toBe(
        "testuser@gmail.com",
      )
    })

    test("Gmail domain variations", () => {
      expect(normalizeEmail("user@googlemail.com")).toBe("user@gmail.com")
      expect(normalizeEmail("user@googlemail.co.uk")).toBe("user@gmail.com")
      expect(normalizeEmail("user@googlemail.de")).toBe("user@gmail.com")
      expect(normalizeEmail("test.user+alias@googlemail.com")).toBe(
        "testuser@gmail.com",
      )
    })

    test("Non-Gmail domains - plus addressing only", () => {
      expect(normalizeEmail("user+test@yahoo.com")).toBe("user@yahoo.com")
      expect(normalizeEmail("john+newsletter@outlook.com")).toBe(
        "john@outlook.com",
      )
      expect(normalizeEmail("test+123@example.org")).toBe("test@example.org")

      // Dots should be preserved for non-Gmail
      expect(normalizeEmail("user.test@yahoo.com")).toBe("user.test@yahoo.com")
      expect(normalizeEmail("john.doe@outlook.com")).toBe(
        "john.doe@outlook.com",
      )
    })

    test("Complex real-world examples", () => {
      expect(normalizeEmail("  JOHN.DOE+WORK+EMAILS@GMAIL.COM  ")).toBe(
        "johndoe@gmail.com",
      )
      expect(
        normalizeEmail("test.email.address+newsletter@googlemail.co.uk"),
      ).toBe("testemailaddress@gmail.com")
      expect(normalizeEmail("User.Name+Shopping+Deals@Gmail.Com")).toBe(
        "username@gmail.com",
      )
    })

    test("edge cases", () => {
      expect(normalizeEmail("user@gmail.com")).toBe("user@gmail.com")
      expect(normalizeEmail("a@gmail.com")).toBe("a@gmail.com")
      expect(normalizeEmail("user+@gmail.com")).toBe("user@gmail.com") // empty alias
      expect(normalizeEmail("user.@gmail.com")).toBe("user@gmail.com") // trailing dot
    })

    test("preserves international domains", () => {
      expect(normalizeEmail("user@example.中国")).toBe("user@example.中国")
      expect(normalizeEmail("test+alias@domain.рф")).toBe("test@domain.рф")
    })

    test("error cases", () => {
      expect(() => normalizeEmail("")).toThrow(
        "Invalid email provided for normalization",
      )
      expect(() => normalizeEmail("invalid-email")).toThrow(
        "Invalid email format - missing @ symbol",
      )
      expect(() => normalizeEmail("@gmail.com")).toThrow(
        "Invalid email format - missing @ symbol",
      )
      expect(() => normalizeEmail("user@")).toThrow(
        "Invalid email format - missing @ symbol",
      )
      expect(() => normalizeEmail(null as any)).toThrow(
        "Invalid email provided for normalization",
      )
      expect(() => normalizeEmail(undefined as any)).toThrow(
        "Invalid email provided for normalization",
      )
      expect(() => normalizeEmail(123 as any)).toThrow(
        "Invalid email provided for normalization",
      )
    })
  })

  describe("normalizeEmailWithDetails", () => {
    test("returns both original and normalized email", () => {
      const result = normalizeEmailWithDetails("  USER+TEST@GMAIL.COM  ")
      expect(result).toEqual({
        originalEmail: "  USER+TEST@GMAIL.COM  ",
        normalizedEmail: "user@gmail.com",
      })
    })

    test("works with unchanged emails", () => {
      const result = normalizeEmailWithDetails("user@example.com")
      expect(result).toEqual({
        originalEmail: "user@example.com",
        normalizedEmail: "user@example.com",
      })
    })
  })

  describe("areEmailsEquivalent", () => {
    test("detects equivalent Gmail addresses", () => {
      expect(areEmailsEquivalent("user@gmail.com", "u.s.e.r@gmail.com")).toBe(
        true,
      )
      expect(areEmailsEquivalent("user@gmail.com", "user+test@gmail.com")).toBe(
        true,
      )
      expect(
        areEmailsEquivalent("u.s.e.r+test@gmail.com", "user@gmail.com"),
      ).toBe(true)
      expect(
        areEmailsEquivalent(
          "john.doe+work@gmail.com",
          "johndoe+newsletter@gmail.com",
        ),
      ).toBe(true)
    })

    test("detects equivalent emails across domain variations", () => {
      expect(areEmailsEquivalent("user@gmail.com", "user@googlemail.com")).toBe(
        true,
      )
      expect(
        areEmailsEquivalent("test+alias@gmail.com", "t.e.s.t@googlemail.co.uk"),
      ).toBe(true)
    })

    test("detects different emails", () => {
      expect(areEmailsEquivalent("user@gmail.com", "different@gmail.com")).toBe(
        false,
      )
      expect(areEmailsEquivalent("user@gmail.com", "user@yahoo.com")).toBe(
        false,
      )
      expect(
        areEmailsEquivalent("john.doe@gmail.com", "jane.doe@gmail.com"),
      ).toBe(false)
    })

    test("handles non-Gmail domains", () => {
      expect(areEmailsEquivalent("user+test@yahoo.com", "user@yahoo.com")).toBe(
        true,
      )
      expect(
        areEmailsEquivalent("user.test@yahoo.com", "user.test+alias@yahoo.com"),
      ).toBe(true)
      // Dots preserved for non-Gmail
      expect(
        areEmailsEquivalent("user.test@yahoo.com", "usertest@yahoo.com"),
      ).toBe(false)
    })

    test("handles invalid emails gracefully", () => {
      expect(areEmailsEquivalent("invalid-email", "user@gmail.com")).toBe(false)
      expect(areEmailsEquivalent("user@gmail.com", "")).toBe(false)
      expect(areEmailsEquivalent("", "")).toBe(false)
      expect(areEmailsEquivalent("user@gmail.com", null as any)).toBe(false)
    })

    test("case sensitivity", () => {
      expect(areEmailsEquivalent("USER@GMAIL.COM", "user@gmail.com")).toBe(true)
      expect(
        areEmailsEquivalent("John.Doe+Test@Gmail.Com", "johndoe@gmail.com"),
      ).toBe(true)
    })
  })

  describe("Security implications", () => {
    test("prevents common bypass attempts", () => {
      const baseEmail = "user@gmail.com"

      // These should all normalize to the same email
      const variations = [
        "user@gmail.com",
        "u.s.e.r@gmail.com",
        "user+test@gmail.com",
        "user+hack@gmail.com",
        "u.s.e.r+anything@gmail.com",
        "user@googlemail.com",
        "u.s.e.r+test@googlemail.co.uk",
        "  USER+TEST@GMAIL.COM  ",
      ]

      const normalized = variations.map((email) => normalizeEmail(email))
      const allSame = normalized.every((email) => email === baseEmail)

      expect(allSame).toBe(true)
    })

    test("maintains distinction for different providers", () => {
      // These should remain different
      expect(normalizeEmail("user.test@yahoo.com")).not.toBe(
        normalizeEmail("usertest@yahoo.com"),
      )
      expect(normalizeEmail("user@gmail.com")).not.toBe(
        normalizeEmail("user@yahoo.com"),
      )
      expect(normalizeEmail("user@example.com")).not.toBe(
        normalizeEmail("user@sample.com"),
      )
    })

    test("handles malicious input safely", () => {
      // Should not crash on unusual input
      expect(() => normalizeEmail("user@domain.com")).not.toThrow()
      expect(() =>
        normalizeEmail(
          "very.long.email.address.with.many.dots@very.long.domain.name.example.com",
        ),
      ).not.toThrow()
    })
  })
})
