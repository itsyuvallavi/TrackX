// Owner: services/api. Transaction route handlers and API validation.
import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  ApiCreateTransactionSchema,
  ApiNotFoundError,
  ApiUpdateTransactionSchema,
  TransactionParamsSchema,
  UndoLastSchema,
  UpdateLastCategorySchema,
  UserQuerySchema,
  type TransactionService,
} from "../services/transaction-service.js";
import {
  FromMessageSchema,
  type FromMessageService,
} from "../services/from-message-service.js";
import { CategoryNotFoundError } from "../repositories/transactions.js";
import { ParserClientError } from "../clients/parser-client.js";

export async function registerTransactionRoutes(
  server: FastifyInstance,
  service: TransactionService,
  fromMessageService?: FromMessageService,
): Promise<void> {
  server.get("/transactions", async (request, reply) => {
    try {
      const query = UserQuerySchema.parse(request.query);
      return reply.status(200).send(await service.list(query.userId));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.post("/transactions", async (request, reply) => {
    try {
      const input = ApiCreateTransactionSchema.parse(request.body);
      return reply.status(201).send(await service.create(input));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.post("/transactions/from-message", async (request, reply) => {
    if (!fromMessageService) {
      return reply.status(503).send({
        error: "From-message service is not configured.",
      });
    }

    try {
      const input = FromMessageSchema.parse(request.body);
      return reply
        .status(201)
        .send(await fromMessageService.createFromMessage(input));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.patch("/transactions/:id", async (request, reply) => {
    try {
      const params = TransactionParamsSchema.parse(request.params);
      const input = ApiUpdateTransactionSchema.parse(request.body);
      return reply.status(200).send(await service.update(params.id, input));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.delete("/transactions/:id", async (request, reply) => {
    try {
      const params = TransactionParamsSchema.parse(request.params);
      const query = UserQuerySchema.parse(request.query);
      return reply
        .status(200)
        .send(await service.remove(params.id, query.userId));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.post("/transactions/undo-last", async (request, reply) => {
    try {
      const input = UndoLastSchema.parse(request.body ?? {});
      return reply.status(200).send(await service.undoLast(input));
    } catch (error) {
      return sendApiError(reply, error);
    }
  });

  server.post("/transactions/update-last-category", async (request, reply) => {
    try {
      const input = UpdateLastCategorySchema.parse(request.body ?? {});
      return reply.status(200).send(await service.updateLastCategory(input));
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

  if (error instanceof CategoryNotFoundError) {
    return reply.status(400).send({ error: error.message });
  }

  if (error instanceof ParserClientError) {
    return reply.status(502).send({ error: error.message });
  }

  throw error;
}
