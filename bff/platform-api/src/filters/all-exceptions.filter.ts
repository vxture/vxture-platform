/**
 * all-exceptions.filter.ts - global exception filter (diagnostics + clean errors)
 * @package @vxture/bff-platform-api
 *
 * NestJS otherwise turns any raw (non-HttpException) throw into a bare 500 whose
 * stack is never logged, hiding the real fault. This filter logs the method +
 * URL + full stack for every 5xx / unexpected throw, and returns a clean JSON
 * error (no internals leaked). HttpExceptions keep their original status + body.
 */
import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("UnhandledException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the real stack + endpoint for any 5xx / non-HttpException — without this
    // the actual throw is invisible behind NestJS's generic "Internal server error".
    if (!isHttp || status >= 500) {
      const detail =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception);
      this.logger.error(
        `${req.method} ${req.originalUrl} → ${status}\n${detail}`,
      );
    }

    const body = isHttp
      ? (exception.getResponse() as object)
      : {
          statusCode: status,
          error: "Internal Server Error",
          message: "internal_error",
        };
    res.status(status).json(body);
  }
}
