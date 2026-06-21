// Owner: apps/web. Shared error mapping for Next.js API route handlers.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  ApiNotFoundError,
  CategoryNotFoundError,
  ParserClientError,
} from "@trackx/api-core";

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

  if (error instanceof ApiNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof CategoryNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof ParserClientError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  throw error;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiRouteBadRequestError("Invalid JSON body.");
  }
}
