// Owner: services/api. Health route for the API service.
import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(
  server: FastifyInstance,
): Promise<void> {
  server.get("/health", async () => ({ ok: true, service: "api" }));
}
