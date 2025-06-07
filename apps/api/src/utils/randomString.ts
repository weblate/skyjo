import { type RandomReader, generateRandomString } from "@oslojs/crypto/random"

const random: RandomReader = {
  read(bytes) {
    crypto.getRandomValues(bytes)
  },
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export const generateRandomToken = (length: number = 64) =>
  generateRandomString(random, alphabet, length)
