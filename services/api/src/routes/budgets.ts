// Owner: services/api. Budget and dashboard route handlers.
import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  ApiNotFoundError,
  BudgetListQuerySchema,
  BudgetStatusQuerySchema,
  UserQuerySchema,
  type BudgetService,
} from "@trackx/api-core";

export async function registerBudgetRoutes(
  server: FastifyInstance,
  service: BudgetService,
): Promise<void> {
  server.get("/budgets", async (request, reply) => {
    try {
      const query = BudgetListQuerySchema.parse(request.query);
      return reply.status(200).send(await service.list(query));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.get("/budgets/status", async (request, reply) => {
    try {
      const query = BudgetStatusQuerySchema.parse(request.query);
      return reply.status(200).send(await service.getStatus(query));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.get("/dashboard/week", async (request, reply) => {
    try {
      const query = UserQuerySchema.parse(request.query);
      return reply
        .status(200)
        .send(await service.getWeekDashboard(query.userId));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.get("/dashboard/month", async (request, reply) => {
    try {
      const query = UserQuerySchema.parse(request.query);
      return reply
        .status(200)
        .send(await service.getMonthDashboard(query.userId));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });
}

function sendApiError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Invalid request.",
      details: error.issues,
    });
  }

  if (error instanceof ApiNotFoundError) {
    return reply.status(404).send({ error: error.message });
  }

  throw error;
}
