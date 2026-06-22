// Owner: apps/web. Shared error mapping for Next.js API route handlers.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApiNotFoundError,
  CategoryNotFoundError,
  ParserClientError,
} from "@trackx/api-core";
import { ApiUnauthorizedError } from "@/lib/api-route-auth";

export class ApiRouteBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiRouteBadRequestError";
  }
}

export function toApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", details: error.issues },
      { status: 400 },
    );
  }

  if (error instanceof ApiRouteBadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof ApiUnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ApiNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof CategoryNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof ParserClientError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (isPrismaClientError(error)) {
    console.error("Database error in API route:", error);
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );
  }

  console.error("Unhandled API route error:", error);
  throw error;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiRouteBadRequestError("Invalid JSON body.");
  }
}

function isPrismaClientError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  const name = error.name;

  return typeof name === "string" && name.startsWith("PrismaClient");
}
