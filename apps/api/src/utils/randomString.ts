import { generateRandomString, type RandomReader } from "@oslojs/crypto/random"
import { sha3_256 } from "@oslojs/crypto/sha3"
import { encodeHexLowerCase } from "@oslojs/encoding"

const random: RandomReader = {
  read(bytes) {
    crypto.getRandomValues(bytes)
  },
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export const generateRandomToken = (length: number = 64) =>
  generateRandomString(random, alphabet, length)

export const hashToken = (token: string) =>
  encodeHexLowerCase(sha3_256(new TextEncoder().encode(token)))
