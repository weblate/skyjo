import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import {
  Job,
  Queue,
  type QueueOptions,
  Worker,
  type WorkerOptions,
} from "bullmq"

export abstract class BaseQueueService<T> {
  private readonly queueName: string
  protected queue: Queue<T>
  protected worker: Worker<T>
  private isShuttingDown = false

  constructor(queueName: string, options: Partial<QueueOptions> = {}) {
    this.queueName = queueName

    Logger.info(`Initializing queue service: ${this.queueName}`)

    this.queue = new Queue(queueName, {
      connection: {
        url: ENV.REDIS_URL,
        enableOfflineQueue: true,
      },
      ...options,
    })

    this.worker = this.createWorker()
    this.setupListeners()

    Logger.info(`Queue service initialized: ${this.queueName}`)
  }

  protected abstract processJob(jobData: Job<T>): Promise<void>

  private createWorker(options: Partial<WorkerOptions> = {}): Worker<T> {
    Logger.info(`Creating worker for queue: ${this.queueName}`)

    return new Worker<T>(
      this.queueName,
      async (job) => {
        if (this.isShuttingDown) {
          Logger.info(`Skipping job ${job.id} due to shutdown in progress`, {
            jobId: job.id,
            queueName: this.queueName,
          })
          return
        }

        Logger.info(`Processing job ${job.id} from queue ${this.queueName}`, {
          jobId: job.id,
          queueName: this.queueName,
          jobData: job.data,
        })

        try {
          await this.processJob(job)

          Logger.info(
            `Job ${job.id} from queue ${this.queueName} processed successfully`,
            {
              jobId: job.id,
              queueName: this.queueName,
            },
          )
        } catch (error) {
          Logger.error(
            `Error processing job ${job.id} from queue ${this.queueName}`,
            {
              jobId: job.id,
              queueName: this.queueName,
              error,
            },
          )
          throw error
        }
      },
      {
        connection: {
          url: ENV.REDIS_URL,
          enableOfflineQueue: true,
        },
        removeOnComplete: { count: 20, age: 15 * 60 },
        removeOnFail: { count: 20, age: 15 * 60 },
        concurrency: 2,
        limiter: {
          max: 10,
          duration: 1000,
        },
        ...options,
      },
    )
  }

  private setupListeners(): void {
    Logger.info(`Setting up listeners for queue: ${this.queueName}`)

    this.worker.on("active", (job) => {
      Logger.info(
        `Job ${job.id} has started processing in queue ${this.queueName}`,
        {
          jobId: job.id,
          queueName: this.queueName,
        },
      )
    })

    this.worker.on("failed", (job, error) => {
      if (job?.attemptsMade && job?.attemptsMade < job?.opts.attempts!) {
        Logger.warn(
          `${this.queueName} job ${job.id} failed, attempt ${job.attemptsMade} of ${job.opts.attempts}`,
          {
            error,
            jobId: job.id,
            queueName: this.queueName,
            attemptsMade: job.attemptsMade,
            maxAttempts: job.opts.attempts,
            jobData: job.data,
          },
        )
      } else {
        Logger.error(`${this.queueName} job ${job?.id} failed permanently`, {
          error,
          jobId: job?.id,
          queueName: this.queueName,
          attemptsMade: job?.attemptsMade,
          jobData: job?.data,
        })
      }
    })

    this.worker.on("completed", (job) => {
      Logger.info(
        `${this.queueName} job ${job.id} completed successfully after ${job.attemptsMade} retries`,
        {
          jobId: job.id,
          queueName: this.queueName,
          attemptsMade: job.attemptsMade,
          processingTime: job.processedOn
            ? Date.now() - job.processedOn
            : undefined,
        },
      )
    })

    this.worker.on("stalled", (jobId) => {
      Logger.warn(`Job ${jobId} in queue ${this.queueName} has stalled`, {
        jobId,
        queueName: this.queueName,
      })
    })

    this.worker.on("error", (err) => {
      Logger.error(`Worker error in queue ${this.queueName}`, {
        workerError: err,
        queueName: this.queueName,
      })
    })

    this.worker.on("drained", () => {
      Logger.debug(`Queue ${this.queueName} drained`, {
        queueName: this.queueName,
      })
    })
  }

  public async cleanup(): Promise<void> {
    Logger.info(`Cleaning up queue service: ${this.queueName}`)
    this.isShuttingDown = true

    try {
      await this.worker.close(true)
      Logger.info(`Worker closed for queue: ${this.queueName}`)

      await this.queue.close()
      Logger.info(`Queue closed: ${this.queueName}`)
    } catch (error) {
      Logger.error(`Error during queue service cleanup: ${this.queueName}`, {
        error,
        queueName: this.queueName,
      })
    }
  }
}
