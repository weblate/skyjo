import { db } from "@/db/index.js"
import { type UserDb, userTable } from "@/db/schema.js"
import { hashPassword } from "@/http/auth/lib/password.js"
import type { Avatar } from "@skymo/core"
import { UserError } from "@skymo/shared/constants"
import { eq } from "drizzle-orm"

interface CreateUserParams {
  email: string
  username?: string
  userTag?: string
  googleId?: string
  locale?: string
  avatar?: Avatar
  emailVerified?: boolean
  password?: string
}
export async function createUser({
  googleId,
  email,
  username,
  userTag,
  locale,
  avatar,
  emailVerified,
  password,
}: CreateUserParams): Promise<UserDb> {
  const createdUsername = username ?? "unnamed"
  const createdUserTag = userTag ?? (await createUserTag(createdUsername))

  const row = await db
    .insert(userTable)
    .values({
      email,
      username: createdUsername,
      userTag: createdUserTag,
      password: password ? await hashPassword(password) : null,
      googleId: googleId ?? null,
      locale,
      avatar,
      emailVerified,
    })
    .returning({
      id: userTable.id,
      username: userTable.username,
      userTag: userTable.userTag,
      email: userTable.email,
      googleId: userTable.googleId,
      facebookId: userTable.facebookId,
      locale: userTable.locale,
      avatar: userTable.avatar,
      emailVerified: userTable.emailVerified,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })

  const user = row?.[0]
  if (!user) throw new Error(UserError.UNEXPECTED_ERROR)

  return user
}

export async function getUserFromGoogleId(
  googleId: string,
): Promise<UserDb | null> {
  const row = await db
    .select()
    .from(userTable)
    .where(eq(userTable.googleId, googleId))
    .limit(1)

  const user = row?.[0]
  if (!user) return null

  return user
}

export async function createUserTag(username: string) {
  const parsedUsername = username.slice(0, 15)

  let userTag = ""
  // Generate a user tag until it's unique. Maximum of 20 retries before throwing an error
  for (let i = 0; i < 20; i++) {
    userTag = `${parsedUsername}_${Math.floor(1000 + Math.random() * 9000)}`

    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.userTag, userTag))
      .limit(1)

    if (existingUser.length === 0) break
    if (i === 19) throw new Error(UserError.USER_CREATION_FAILED)
  }

  return userTag
}
