import type {
  InternalEventType,
  MetaWebhookChange,
  MetaWebhookEnvelope,
  MetaMessagingEvent,
  NormalizedWebhookEvent,
} from "../types/instagram.js";

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function fromChange(change: MetaWebhookChange): NormalizedWebhookEvent {
  const field = (change.field ?? "").toLowerCase();
  const value = change.value ?? {};
  const eventType: InternalEventType =
    field === "comments" ? "comment" : field === "mentions" ? "mention" : "unknown";

  const commentId = typeof value.id === "string" ? value.id : null;
  const mediaId = typeof value.media?.id === "string" ? value.media.id : null;
  const userId = typeof value.from?.id === "string" ? value.from.id : null;
  const username = typeof value.from?.username === "string" ? value.from.username : null;
  const commentText = typeof value.text === "string" ? value.text : null;

  return {
    eventType,
    eventId: commentId ?? `${eventType}_${Date.now()}_${randomSuffix()}`,
    mediaId,
    userId,
    username,
    commentId,
    messageId: null,
    commentText,
    payloadSummary:
      eventType === "unknown"
        ? `Unrecognized "changes" field: ${change.field ?? "(missing)"}`
        : `${eventType === "comment" ? "Comment" : "Mention"} event on media ${mediaId ?? "(unknown)"}`,
  };
}

function fromMessagingEvent(item: MetaMessagingEvent): NormalizedWebhookEvent {
  const userId = typeof item.sender?.id === "string" ? item.sender.id : null;

  let eventType: InternalEventType = "unknown";
  let messageId: string | null = null;
  let summary = "Unrecognized messaging event";

  if (item.message && !item.message.is_echo) {
    eventType = "message";
    messageId = typeof item.message.mid === "string" ? item.message.mid : null;
    summary = `Message received from ${userId ?? "(unknown user)"}`;
  } else if (item.message?.is_echo) {
    // Echo of our own outgoing message — not an inbound event we act on in Phase 4.
    eventType = "unknown";
    summary = "Echo of an outgoing message (ignored)";
  } else if (item.delivery) {
    eventType = "message_delivery";
    messageId = Array.isArray(item.delivery.mids) && item.delivery.mids.length > 0 ? item.delivery.mids[0] : null;
    summary = `Delivery receipt for ${item.delivery.mids?.length ?? 0} message(s)`;
  } else if (item.read) {
    eventType = "message_read";
    summary = `Read receipt (watermark ${item.read.watermark ?? "?"})`;
  }

  const messageText =
    typeof item.message?.text === "string" ? item.message.text : null;

  return {
    eventType,
    eventId: messageId ?? `${eventType}_${Date.now()}_${randomSuffix()}`,
    mediaId: null,
    userId,
    username: null, // Meta's messaging webhook never includes a username, only a sender PSID.
    commentId: null,
    messageId,
    commentText: messageText,
    payloadSummary: summary,
  };
}

/**
 * Parses a raw Meta webhook POST body into zero or more normalized events.
 * A single request can legitimately contain multiple entries and multiple
 * changes/messaging items per entry — Meta batches events.
 *
 * Never throws: malformed input yields a single "unknown" event so the
 * caller can still log something and return 200 rather than lose the event.
 */
export function parseWebhookEvents(body: unknown): NormalizedWebhookEvent[] {
  try {
    const envelope = body as MetaWebhookEnvelope;
    const entries = Array.isArray(envelope?.entry) ? envelope.entry : [];

    if (entries.length === 0) {
      return [
        {
          eventType: "unknown",
          eventId: `unknown_${Date.now()}_${randomSuffix()}`,
          mediaId: null,
          userId: null,
          username: null,
          commentId: null,
          messageId: null,
          commentText: null,
          payloadSummary: "Webhook payload had no entries to parse",
        },
      ];
    }

    const events: NormalizedWebhookEvent[] = [];
    for (const entry of entries) {
      if (Array.isArray(entry?.changes)) {
        for (const change of entry.changes) events.push(fromChange(change));
      }
      if (Array.isArray(entry?.messaging)) {
        for (const item of entry.messaging) events.push(fromMessagingEvent(item));
      }
      if (!Array.isArray(entry?.changes) && !Array.isArray(entry?.messaging)) {
        events.push({
          eventType: "unknown",
          eventId: `unknown_${Date.now()}_${randomSuffix()}`,
          mediaId: null,
          userId: null,
          username: null,
          commentId: null,
          messageId: null,
          commentText: null,
          payloadSummary: "Entry had neither changes nor messaging",
        });
      }
    }
    return events;
  } catch {
    return [
      {
        eventType: "unknown",
        eventId: `unknown_${Date.now()}_${randomSuffix()}`,
        mediaId: null,
        userId: null,
        username: null,
        commentId: null,
        messageId: null,
        commentText: null,
        payloadSummary: "Failed to parse webhook payload",
      },
    ];
  }
}
