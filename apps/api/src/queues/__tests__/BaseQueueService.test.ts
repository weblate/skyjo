import { Job, Queue, Worker } from "bullmq"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BaseQueueService } from "../BaseQueueService.js"

// Mock Queue and Worker constructors
const mockQueueAdd = vi.fn().mockResolvedValue(undefined)
const mockQueueRemove = vi.fn().mockResolvedValue(undefined)
const mockQueueClose = vi.fn().mockResolvedValue(undefined)
const mockQueueDrain = vi.fn().mockResolvedValue(undefined)

const mockWorkerOn = vi.fn().mockReturnThis()
const mockWorkerClose = vi.fn().mockResolvedValue(undefined)

// Define mocks before importing/using the module
vi.mock("bullmq", () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: mockQueueAdd,
      remove: mockQueueRemove,
      close: mockQueueClose,
      drain: mockQueueDrain,
      getJob: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    })),
    Worker: vi.fn().mockImplementation(() => ({
      on: mockWorkerOn,
      close: mockWorkerClose,
    })),
    Job: vi.fn().mockImplementation((_, data) => ({
      data,
      id: "test-job-id",
      attemptsMade: 0,
      opts: { attempts: 3 },
      moveToCompleted: vi.fn().mockResolvedValue(undefined),
      moveToFailed: vi.fn().mockResolvedValue(undefined),
      processedOn: Date.now() - 1000,
      token: "test-token",
    })),
  }
})

// Mock Logger
vi.mock("@skymo/logger", () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock environment
vi.mock("@env", () => ({
  ENV: {
    REDIS_URL: "redis://mock-redis-url",
  },
}))

// Concrete implementation of BaseQueueService for testing
interface TestJobData {
  testId: string
  data: string
}

class TestQueueService extends BaseQueueService<TestJobData> {
  processJobCalled = false

  constructor() {
    super("test-queue")
  }

  protected async processJob(_job: Job<TestJobData>): Promise<void> {
    this.processJobCalled = true
  }

  // Expose methods for testing
  public async testProcessJob(job: Job<TestJobData>): Promise<void> {
    return this.processJob(job)
  }

  public getQueue(): Queue<TestJobData> {
    return this.queue
  }

  public getWorker(): Worker<TestJobData> {
    return this.worker
  }
}

describe("BaseQueueService", () => {
  let queueService: TestQueueService
  let mockJob: Job<TestJobData>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create the service after clearing mocks
    queueService = new TestQueueService()

    // Create a mock job
    mockJob = {
      data: { testId: "123", data: "test-data" },
      id: "job-123",
      attemptsMade: 0,
      opts: { attempts: 3 },
      moveToCompleted: vi.fn().mockResolvedValue(undefined),
      moveToFailed: vi.fn().mockResolvedValue(undefined),
      processedOn: Date.now() - 1000,
      token: "test-token",
    } as unknown as Job<TestJobData>
  })

  afterEach(async () => {
    await queueService.cleanup()
  })

  it("should initialize with correct queue name", () => {
    expect(Queue).toHaveBeenCalledWith(
      "test-queue",
      expect.objectContaining({
        connection: expect.objectContaining({
          url: "redis://mock-redis-url",
          enableOfflineQueue: true,
        }),
      }),
    )
  })

  it("should create a worker with event listeners", () => {
    expect(Worker).toHaveBeenCalledWith(
      "test-queue",
      expect.any(Function),
      expect.objectContaining({
        concurrency: 2,
        limiter: expect.objectContaining({
          max: 10,
          duration: 1000,
        }),
      }),
    )

    // Check that event listeners were set up
    expect(mockWorkerOn).toHaveBeenCalledWith("active", expect.any(Function))
    expect(mockWorkerOn).toHaveBeenCalledWith("failed", expect.any(Function))
    expect(mockWorkerOn).toHaveBeenCalledWith("completed", expect.any(Function))
    expect(mockWorkerOn).toHaveBeenCalledWith("stalled", expect.any(Function))
    expect(mockWorkerOn).toHaveBeenCalledWith("error", expect.any(Function))
    expect(mockWorkerOn).toHaveBeenCalledWith("drained", expect.any(Function))
  })

  it("should process job correctly", async () => {
    await queueService.testProcessJob(mockJob)
    expect(queueService.processJobCalled).toBe(true)
  })

  it("should cleanup properly", async () => {
    await queueService.cleanup()
    expect(mockWorkerClose).toHaveBeenCalledWith(true)
    expect(mockQueueClose).toHaveBeenCalled()
  })
})
