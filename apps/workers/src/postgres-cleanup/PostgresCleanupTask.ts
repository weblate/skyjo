import { emailChangeTable, passwordResetTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { lt } from "drizzle-orm"
import { db } from "../postgres.js"

export class PostgresCleanupTask {
  private static readonly BATCH_SIZE = 100

  public static async runPostgresCleanup() {
    Logger.info("Starting postgres cleanup job")

    try {
      const [emailChangesResult, passwordResetsResult] =
        await Promise.allSettled([
          this.cleanupExpiredEmailChanges(),
          this.cleanupExpiredPasswordResets(),
        ])

      let totalDeleted = 0

      if (emailChangesResult.status === "fulfilled") {
        totalDeleted += emailChangesResult.value.deletedCount
      } else {
        Logger.error("Email changes cleanup failed", {
          error: emailChangesResult.reason,
        })
      }

      if (passwordResetsResult.status === "fulfilled") {
        totalDeleted += passwordResetsResult.value.deletedCount
      } else {
        Logger.error("Password resets cleanup failed", {
          error: passwordResetsResult.reason,
        })
      }

      Logger.info(
        `Postgres cleanup completed. Total records deleted: ${totalDeleted}`,
        {
          totalDeleted,
        },
      )

      return {
        totalDeleted,
        emailChanges:
          emailChangesResult.status === "fulfilled"
            ? emailChangesResult.value
            : null,
        passwordResets:
          passwordResetsResult.status === "fulfilled"
            ? passwordResetsResult.value
            : null,
      }
    } catch (error) {
      Logger.error("Error during postgres cleanup", { error })
      throw error
    }
  }

  private static async cleanupExpiredEmailChanges() {
    Logger.info("Starting cleanup of expired email changes")

    try {
      const now = new Date()
      let totalDeleted = 0

      while (true) {
        const result = await db
          .delete(emailChangeTable)
          .where(lt(emailChangeTable.expiresAt, now))

        const deletedCount = result.rowCount ?? 0
        totalDeleted += deletedCount

        Logger.debug(
          `Deleted ${deletedCount} expired email change records in this batch`,
          {
            deletedCount,
            totalDeleted,
          },
        )

        if (deletedCount < this.BATCH_SIZE) {
          break
        }
      }

      Logger.info(
        `Completed cleanup of expired email changes. Total deleted: ${totalDeleted}`,
        {
          totalDeleted,
        },
      )

      return { deletedCount: totalDeleted }
    } catch (error) {
      Logger.error("Error during email changes cleanup", { error })
      throw error
    }
  }

  private static async cleanupExpiredPasswordResets() {
    Logger.info("Starting cleanup of expired password resets")

    try {
      const now = new Date()
      let totalDeleted = 0

      while (true) {
        const result = await db
          .delete(passwordResetTable)
          .where(lt(passwordResetTable.expiresAt, now))

        const deletedCount = result.rowCount ?? 0
        totalDeleted += deletedCount

        Logger.debug(
          `Deleted ${deletedCount} expired password reset records in this batch`,
          {
            deletedCount,
            totalDeleted,
          },
        )

        if (deletedCount < this.BATCH_SIZE) {
          break
        }
      }

      Logger.info(
        `Completed cleanup of expired password resets. Total deleted: ${totalDeleted}`,
        {
          totalDeleted,
        },
      )

      return { deletedCount: totalDeleted }
    } catch (error) {
      Logger.error("Error during password resets cleanup", { error })
      throw error
    }
  }
}
