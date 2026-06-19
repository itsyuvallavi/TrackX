// Owner: services/worker. Placeholder weekly summary background job handler.
export type SummaryJobResult = {
  job: "weekly-summary";
  status: "placeholder";
};

export async function runWeeklySummary(): Promise<SummaryJobResult> {
  return {
    job: "weekly-summary",
    status: "placeholder",
  };
}
