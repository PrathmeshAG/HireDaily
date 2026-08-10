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
    field === "comments" || field === "live_comments"
      ? "comment"
      : field === "mentions"
        ? "mention"
        : "unknown";

  const commentId =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : null;

  const parentId =
    typeof value.parent_id === "string" && value.parent_id.trim()
      ? value.parent_id.trim()
      : null;

  const mediaId =
    typeof value.media?.id === "string" && value.media.id.trim()
      ? value.media.id.trim()
      : null;

  const userId =
    typeof value.from?.id === "string" && value.from.id.trim()
      ? value.from.id.trim()
      : null;

  const username =
    typeof value.from?.username === "string" && value.from.username.trim()
      ? value.from.username.trim()
      : null;

  const commentText =
    typeof value.text === "string"
      ? value.text
      : null;

  return {
    eventType,
    eventId:
      commentId ??
      `${eventType}_${Date.now()}_${randomSuffix()}`,

    mediaId,
    userId,
    username,
    commentId,
    parentId,

    messageId: null,
    commentText,

    payloadSummary:
      eventType === "unknown"
        ? `Unrecognized "changes" field: ${
            change.field ?? "(missing)"
          }`
        : `${
            eventType === "comment"
              ? "Comment"
              : "Mention"
          } event on media ${
            mediaId ?? "(unknown)"
          }`,
  };
}

function fromMessagingEvent(
  item: MetaMessagingEvent,
): NormalizedWebhookEvent {
  const userId =
    typeof item.sender?.id === "string"
      ? item.sender.id
      : null;

  let eventType: InternalEventType = "unknown";
  let messageId: string | null = null;
  let summary = "Unrecognized messaging event";

  if (item.message && !item.message.is_echo) {
    eventType = "message";

    messageId =
      typeof item.message.mid === "string"
        ? item.message.mid
        : null;

    summary =
      `Message received from ${
        userId ?? "(unknown user)"
      }`;
  } else if (item.message?.is_echo) {
    eventType = "unknown";

    summary =
      "Echo of an outgoing message (ignored)";
  } else if (item.delivery) {
    eventType = "message_delivery";

    messageId =
      Array.isArray(item.delivery.mids) &&
      item.delivery.mids.length > 0
        ? item.delivery.mids[0]
        : null;

    summary =
      `Delivery receipt for ${
        item.delivery.mids?.length ?? 0
      } message(s)`;
  } else if (item.read) {
    eventType = "message_read";

    summary =
      `Read receipt (watermark ${
        item.read.watermark ?? "?"
      })`;
  }

  const messageText =
    typeof item.message?.text === "string"
      ? item.message.text
      : null;

  return {
    eventType,

    eventId:
      messageId ??
      `${eventType}_${Date.now()}_${randomSuffix()}`,

    mediaId: null,

    userId,

    // Meta messaging events don't provide username.
    username: null,

    commentId: null,
    parentId: null,

    messageId,

    commentText: messageText,

    payloadSummary: summary,
  };
}

/**
 * Remove duplicate comment events from the SAME webhook payload.
 *
 * Important:
 * This only protects against duplicate comment entries inside
 * one Meta webhook request.
 *
 * Cross-request duplicates must still be handled by the
 * Firebase atomic claim in server.ts.
 */
function deduplicateEvents(
  events: NormalizedWebhookEvent[],
): NormalizedWebhookEvent[] {
  const seenCommentIds = new Set<string>();
  const seenMessageIds = new Set<string>();

  const result: NormalizedWebhookEvent[] = [];

  for (const event of events) {
    if (
      event.eventType === "comment" &&
      event.commentId
    ) {
      if (seenCommentIds.has(event.commentId)) {
        continue;
      }

      seenCommentIds.add(event.commentId);
      result.push(event);
      continue;
    }

    if (
      event.eventType === "message" &&
      event.messageId
    ) {
      if (seenMessageIds.has(event.messageId)) {
        continue;
      }

      seenMessageIds.add(event.messageId);
      result.push(event);
      continue;
    }

    result.push(event);
  }

  return result;
}

/**
 * Parses a raw Meta webhook POST body into normalized events.
 *
 * Supports:
 * - changes/comments
 * - live_comments
 * - mentions
 * - messaging
 * - message delivery
 * - message read
 *
 * Never throws.
 */
export function parseWebhookEvents(
  body: unknown,
): NormalizedWebhookEvent[] {
  try {
    const envelope =
      body as MetaWebhookEnvelope;

    const entries =
      Array.isArray(envelope?.entry)
        ? envelope.entry
        : [];

    if (entries.length === 0) {
      return [
        {
          eventType: "unknown",
          eventId:
            `unknown_${Date.now()}_${randomSuffix()}`,

          mediaId: null,
          userId: null,
          username: null,
          commentId: null,
          parentId: null,
          messageId: null,
          commentText: null,

          payloadSummary:
            "Webhook payload had no entries to parse",
        },
      ];
    }

    const events: NormalizedWebhookEvent[] = [];

    for (const entry of entries) {
      if (Array.isArray(entry?.changes)) {
        for (const change of entry.changes) {
          events.push(fromChange(change));
        }
      }

      if (Array.isArray(entry?.messaging)) {
        for (const item of entry.messaging) {
          events.push(fromMessagingEvent(item));
        }
      }

      if (
        !Array.isArray(entry?.changes) &&
        !Array.isArray(entry?.messaging)
      ) {
        events.push({
          eventType: "unknown",
          eventId:
            `unknown_${Date.now()}_${randomSuffix()}`,

          mediaId: null,
          userId: null,
          username: null,
          commentId: null,
          parentId: null,
          messageId: null,
          commentText: null,

          payloadSummary:
            "Entry had neither changes nor messaging",
        });
      }
    }

    return deduplicateEvents(events);
  } catch {
    return [
      {
        eventType: "unknown",
        eventId:
          `unknown_${Date.now()}_${randomSuffix()}`,

        mediaId: null,
        userId: null,
        username: null,
        commentId: null,
        parentId: null,
        messageId: null,
        commentText: null,

        payloadSummary:
          "Failed to parse webhook payload",
      },
    ];
  }
}