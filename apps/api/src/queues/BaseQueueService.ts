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

  constructor(queueName: string, options: Partial<QueueOptions> = {}) {
    this.queueName = queueName

    Logger.info(`Initializing queue service: ${this.queueName}`)

    this.queue = new Queue(queueName, {
      connection: {
        url: ENV.REDIS_URL,
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
        },
        removeOnComplete: { count: 0 },
        concurrency: 3,
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
  }

  public async cleanup(): Promise<void> {
    Logger.info(`Cleaning up queue service: ${this.queueName}`)
    await this.worker.close()
    await this.queue.close()
    Logger.info(`Queue service cleaned up: ${this.queueName}`)
  }
}
