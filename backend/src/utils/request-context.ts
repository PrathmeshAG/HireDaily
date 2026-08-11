import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,100}$/;

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get("x-request-id")?.trim() ?? "";
  const requestId = SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
