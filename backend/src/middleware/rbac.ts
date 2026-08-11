import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function isAdminUser(user: NonNullable<Request["authUser"]>): boolean {
  const claims = user as typeof user & { role?: unknown };
  if (claims.admin === true || claims.role === "admin") return true;
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  return !!env.auth.adminEmail && email === env.auth.adminEmail;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "authentication_required" });
    return;
  }
  if (!isAdminUser(req.authUser)) {
    res.status(403).json({ error: "admin_access_required" });
    return;
  }
  next();
}
