// Owner: services/worker. Placeholder monthly summary background job handler.
export type MonthlySummaryJobResult = {
  job: "monthly-summary";
  status: "placeholder";
};

export async function runMonthlySummary(): Promise<MonthlySummaryJobResult> {
  return {
    job: "monthly-summary",
    status: "placeholder",
  };
}
