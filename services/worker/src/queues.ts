// Owner: services/worker. BullMQ queue and worker setup for TrackX jobs.
import { Queue, Worker, type Job } from "bullmq";
import type { WorkerConfig } from "@trackx/config";
import { runMonthlySummary } from "./jobs/monthly-summary.js";
import { runWeeklySummary } from "./jobs/weekly-summary.js";

export const TRACKX_QUEUE_NAME = "trackx-jobs";

export const WEEKLY_SUMMARY_JOB = "weekly-summary";
export const MONTHLY_SUMMARY_JOB = "monthly-summary";

export const WEEKLY_SUMMARY_CRON = "0 9 * * 1";
export const MONTHLY_SUMMARY_CRON = "0 9 1 * *";

export type WorkerRuntime = {
  queue: Queue;
  worker: Worker;
  close(): Promise<void>;
};

export type StartWorkerOptions = {
  enableSchedules?: boolean;
};

export async function startWorker(
  config: WorkerConfig,
  options: StartWorkerOptions = {},
): Promise<WorkerRuntime> {
  const connection = { url: config.redisUrl };
  const queue = new Queue(TRACKX_QUEUE_NAME, { connection });
  const worker = new Worker(TRACKX_QUEUE_NAME, processJob, { connection });

  if (options.enableSchedules) {
    await registerSchedules(queue);
  }

  worker.on("failed", (job, error) => {
    console.error(
      `[worker] Job ${job?.name ?? "unknown"} failed:`,
      error.message,
    );
  });

  console.info(
    `[worker] Listening on queue "${TRACKX_QUEUE_NAME}" at ${config.redisUrl}`,
  );

  if (!options.enableSchedules) {
    console.info("[worker] Scheduled jobs are disabled.");
  }

  return {
    queue,
    worker,
    async close() {
      await worker.close();
      await queue.close();
    },
  };
}

async function processJob(job: Job): Promise<unknown> {
  switch (job.name) {
    case WEEKLY_SUMMARY_JOB:
      return runWeeklySummary();
    case MONTHLY_SUMMARY_JOB:
      return runMonthlySummary();
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}

async function registerSchedules(queue: Queue): Promise<void> {
  await queue.add(
    WEEKLY_SUMMARY_JOB,
    {},
    { repeat: { pattern: WEEKLY_SUMMARY_CRON } },
  );
  await queue.add(
    MONTHLY_SUMMARY_JOB,
    {},
    { repeat: { pattern: MONTHLY_SUMMARY_CRON } },
  );

  console.info("[worker] Registered weekly and monthly summary schedules.");
}
