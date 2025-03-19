import { SeqTransport } from "@datalust/winston-seq"
import { CError } from "@skymo/error"
import { parse, stringify } from "flatted"
import { createLogger, format, transports } from "winston"
import { ENV } from "../env.js"

/**
 * Get current memory usage statistics
 */
const getMemoryUsage = (): Record<string, unknown> => {
  const memoryUsage = process.memoryUsage()
  return {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)} MB`,
    memoryUsagePercent: `${Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)}%`,
  }
}

/**
 * Process metadata to safely handle circular references using flatted
 * and add memory usage information
 */
const processMeta = (
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const memoryInfo = getMemoryUsage()
  const metaWithMemory = meta
    ? { ...meta, memory: memoryInfo }
    : { memory: memoryInfo }

  try {
    return parse(stringify(metaWithMemory)) as Record<string, unknown>
  } catch (error) {
    return {
      serialization_error: `Failed to serialize metadata: ${error instanceof Error ? error.message : String(error)}`,
      metadata_keys: meta ? Object.keys(meta) : [],
      memory: memoryInfo,
    }
  }
}

export class Logger {
  private static readonly winstonLogger = createLogger({
    level: "debug",
    levels: {
      crit: 1,
      error: 2,
      warn: 3,
      info: 4,
      debug: 5,
    },
    format: format.combine(
      format.json(),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      format.prettyPrint(),
    ),
    defaultMeta: {
      app: ENV.APP_NAME,
      environment: ENV.NODE_ENV,
      version: process.env.npm_package_version ?? "unknown",
    },
    transports: [
      new transports.Console({
        format: format.combine(
          format.json(),
          format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          format.errors({ stack: true }),
          format.printf(({ level, message, timestamp, stack }) => {
            const stackTrace = stack ? `\n${stack}` : ""
            return `${timestamp} [${level}]: ${message} ${stackTrace}`
          }),
        ),
      }),
      new SeqTransport({
        serverUrl: ENV.SEQ_URL,
        apiKey: ENV.SEQ_API_KEY,
        onError: (e) => {
          console.error(
            `Cannot connect to Seq server with given url: ${ENV.SEQ_URL}`,
          )
          console.error(e)
        },
        handleExceptions: true,
        handleRejections: true,
        maxBatchingTime: 15000,
      }),
    ],
  })

  private static shouldLog(): boolean {
    return ENV.NODE_ENV !== "test"
  }

  static debug(message: string, meta?: Record<string, unknown>) {
    if (!Logger.shouldLog()) return

    Logger.winstonLogger.debug(message, processMeta(meta))
  }

  static info(message: string, meta?: Record<string, unknown>) {
    if (!Logger.shouldLog()) return

    Logger.winstonLogger.info(message, processMeta(meta))
  }

  static warn(message: string, meta?: Record<string, unknown>) {
    if (!Logger.shouldLog()) return

    Logger.winstonLogger.warn(message, processMeta(meta))
  }

  static error(message: string, meta?: Record<string, unknown>) {
    if (!Logger.shouldLog()) return

    Logger.winstonLogger.error(message, processMeta(meta))
  }

  static critical(message: string, meta?: Record<string, unknown>) {
    if (!Logger.shouldLog()) return

    Logger.winstonLogger.crit(message, processMeta(meta))
  }

  static cError(error: CError, meta?: Record<string, unknown>) {
    if (!Logger.shouldLog()) return

    const level = error.level
    delete error.level
    delete error.shouldLog

    const logMeta = {
      ...error,
      ...meta,
    }

    switch (level) {
      case "debug":
        Logger.debug(error.message, logMeta)
        break
      case "info":
        Logger.info(error.message, logMeta)
        break
      case "warn":
        Logger.warn(error.message, logMeta)
        break
      case "critical":
        Logger.critical(error.message, logMeta)
        break
      case "error":
      default:
        Logger.error(error.message, logMeta)
        break
    }
  }
}
