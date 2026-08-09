// Meta's webhook payload shape is only loosely documented and varies by
// event type, so these types are intentionally permissive (lots of optional
// fields) — the parser in utils/webhook-parser.ts is what actually handles
// missing/unexpected fields defensively. Treat these as "best effort" shapes,
// not a guarantee of what Meta will send.

export interface MetaWebhookEnvelope {
  object?: string; // expected "instagram"
  entry?: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id?: string; // Instagram Business Account ID
  time?: number;
  changes?: MetaWebhookChange[]; // comments, mentions
  messaging?: MetaMessagingEvent[]; // messages, deliveries, reads
}

export interface MetaWebhookChange {
  field?: string; // "comments" | "mentions" | ...
  value?: {
    id?: string; // comment id / object id
    text?: string;
    media?: { id?: string; media_product_type?: string };
    from?: { id?: string; username?: string };
    parent_id?: string;
    [key: string]: unknown;
  };
}

export interface MetaMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean };
  delivery?: { mids?: string[]; watermark?: number };
  read?: { watermark?: number };
  [key: string]: unknown;
}

// ---------- Normalized internal event ----------

export type InternalEventType =
  | "comment"
  | "mention"
  | "message"
  | "message_delivery"
  | "message_read"
  | "unknown";

export interface NormalizedWebhookEvent {
  eventType: InternalEventType;
  /** Best available unique-ish identifier for this specific event (comment id, message id, or a synthesized fallback). */
  eventId: string;
  mediaId: string | null;
  userId: string | null;
  /** Only populated when Meta includes it (typically comments) — messaging events don't carry a username. */
  username: string | null;
  commentId: string | null;
  messageId: string | null;
  /** Short, non-sensitive human-readable summary — never the full message/comment text. */
  payloadSummary: string;
}
