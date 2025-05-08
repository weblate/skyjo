import { Logger } from "@skymo/logger"
import argon2 from "argon2"

export const hashPassword = async (password: string) => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
    })
  } catch (err) {
    Logger.error("Error hashing password:", { err })
    throw new Error("Could not hash password.")
  }
}

export const verifyPassword = async (hash: string, password: string) => {
  try {
    return await argon2.verify(hash, password)
  } catch (err) {
    Logger.error("Error verifying password:", { err })
    return false
  }
}
