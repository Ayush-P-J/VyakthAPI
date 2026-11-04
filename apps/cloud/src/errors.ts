import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { WriteValidationError, InvalidExpressionError } from "@hexspare/tally-engine";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
export const notFound = (what = "Not found") => new ApiError(404, "not_found", what);

/** Every error leaves as { error: { code, message, details } }. Unexpected ones reveal nothing. */
@Catch()
export class AllErrors implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const send = (status: number, code: string, message: string, details?: unknown) => res.status(status).json({ error: { code, message, ...(details === undefined ? {} : { details }) } });
    if (e instanceof ApiError) return send(e.status, e.code, e.message, e.details);
    if (e instanceof ZodError) return send(400, "invalid_request", "The request is not valid.", e.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
    if (e instanceof WriteValidationError) return send(422, "validation_failed", e.message, e.issues);
    if (e instanceof InvalidExpressionError) return send(422, "invalid_expression", e.message);
    if (e instanceof HttpException) {
      const status = e.getStatus();
      if (status === 413) return send(413, "payload_too_large", "The request body is too large.");
      if (status < 500) return send(status, status === 404 ? "not_found" : "bad_request", e.message);
    }
    if ((e as { type?: string })?.type === "entity.parse.failed") return send(400, "invalid_json", "The request body is not valid JSON.");
    if ((e as { type?: string })?.type === "entity.too.large") return send(413, "payload_too_large", "The request body is too large.");
    console.error("[error]", e);
    return send(500, "internal_error", "Something went wrong on our side.");
  }
}
