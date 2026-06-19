// Owner: services/worker. Offline tests for placeholder summary job handlers.
import { describe, expect, it } from "vitest";
import { runMonthlySummary } from "../jobs/monthly-summary.js";
import { runWeeklySummary } from "../jobs/weekly-summary.js";
import {
  MONTHLY_SUMMARY_CRON,
  MONTHLY_SUMMARY_JOB,
  TRACKX_QUEUE_NAME,
  WEEKLY_SUMMARY_CRON,
  WEEKLY_SUMMARY_JOB,
} from "../queues.js";

describe("summary job handlers", () => {
  it("returns a weekly summary placeholder result", async () => {
    await expect(runWeeklySummary()).resolves.toEqual({
      job: "weekly-summary",
      status: "placeholder",
    });
  });

  it("returns a monthly summary placeholder result", async () => {
    await expect(runMonthlySummary()).resolves.toEqual({
      job: "monthly-summary",
      status: "placeholder",
    });
  });
});

describe("queue constants", () => {
  it("uses stable queue and job names", () => {
    expect(TRACKX_QUEUE_NAME).toBe("trackx-jobs");
    expect(WEEKLY_SUMMARY_JOB).toBe("weekly-summary");
    expect(MONTHLY_SUMMARY_JOB).toBe("monthly-summary");
  });

  it("defines cron patterns for future schedules", () => {
    expect(WEEKLY_SUMMARY_CRON).toBe("0 9 * * 1");
    expect(MONTHLY_SUMMARY_CRON).toBe("0 9 1 * *");
  });
});
