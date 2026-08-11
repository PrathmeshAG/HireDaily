import type { NextFunction, Request, Response } from "express";
import { verifyFirebaseIdToken } from "../services/firebase-admin.service.js";

export type FirebaseTokenVerifier = (token: string) => Promise<Express.Request["authUser"]>;

function bearerToken(req: Request): string | null {
  const header = req.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function createFirebaseAuthMiddleware(
  verifyToken: FirebaseTokenVerifier = verifyFirebaseIdToken,
) {
  return async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "authentication_required" });
      return;
    }

    try {
      const decoded = await verifyToken(token);
      if (!decoded) {
        res.status(401).json({ error: "invalid_authentication" });
        return;
      }
      req.authUser = decoded;
      next();
    } catch {
      res.status(401).json({ error: "invalid_authentication" });
    }
  };
}

export const requireFirebaseAuth = createFirebaseAuthMiddleware();
