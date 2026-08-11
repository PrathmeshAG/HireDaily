import type { DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      authUser?: DecodedIdToken;
      requestId?: string;
      rawBody?: Buffer;
    }
  }
}

export {};
