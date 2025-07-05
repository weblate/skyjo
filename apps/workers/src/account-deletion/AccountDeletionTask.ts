import { ENV } from "@env"
import {
  accountDeletionTable,
  playerTable,
  userTable,
} from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type { AccountDeletionJobData } from "@skymo/worker-types"
import { Queue } from "bullmq"
import { and, eq } from "drizzle-orm"
import { db } from "@/postgres.js"

const mailerQueue = new Queue("mailer", {
  connection: {
    url: ENV.REDIS_URL,
    enableOfflineQueue: true,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
})

export class AccountDeletionTask {
  static async processAccountDeletion(
    jobId: string,
    data: AccountDeletionJobData,
  ): Promise<void> {
    const { userId } = data

    Logger.info(`Starting account deletion process for user ${userId}`, {
      userId,
      jobId,
    })

    try {
      let username = "deleted_user"
      let i = 0

      const [user] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1)

      if (!user) {
        Logger.warn(`User ${userId} not found`, {
          userId,
          jobId,
        })
        return
      }

      const [accountDeletion] = await db
        .select()
        .from(accountDeletionTable)
        .where(
          and(
            eq(accountDeletionTable.jobId, jobId),
            eq(accountDeletionTable.userId, userId),
          ),
        )
        .limit(1)

      if (!accountDeletion) {
        Logger.warn(
          `Account deletion not found for user ${userId}. Deletion has been cancelled but the job has not been removed from the queue.`,
          {
            userId,
            jobId,
          },
        )
        return
      }

      while (true) {
        const existingUser = await db
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.username, username))
          .limit(1)

        if (existingUser.length === 0) break
        if (i === 19)
          throw new Error("Unable to generate unique deleted username")

        username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`
        i++
      }

      await db.transaction(async (tx) => {
        await tx
          .update(userTable)
          .set({
            email: `${username}@skymo.online`,
            username: username,
            name: "deleted_user",
            avatar: "owl",
            googleId: null,
            facebookId: null,
            updatedAt: new Date(),
            deletedAt: new Date(),
          })
          .where(eq(userTable.id, userId))

        await tx
          .update(playerTable)
          .set({
            name: "deleted_user",
            avatar: "owl",
            userId: null,
          })
          .where(eq(playerTable.userId, userId))

        await tx
          .delete(accountDeletionTable)
          .where(eq(accountDeletionTable.userId, userId))
      })

      await mailerQueue.add("account-deleted", {
        to: user.email,
        template: "account-deleted",
        locale: user.locale,
        content: undefined,
      })

      Logger.info(`Account deletion completed for user ${userId}`, {
        userId,
        newUsername: username,
      })
    } catch (error) {
      Logger.error(`Failed to delete account for user ${userId}`, {
        userId,
        error,
      })
      throw error
    }
  }
}
