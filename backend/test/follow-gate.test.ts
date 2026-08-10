import {
  checkInstagramUserFollow,
  sendFollowGateMessage,
  FOLLOW_GATE_PAYLOAD,
  HIRE_DAILY_INSTAGRAM_URL,
  META_GRAPH_VERSION,
} from "../src/services/instagram.service.js";
import { parseWebhookEvents } from "../src/utils/webhook-parser.js";

let passed = 0;
let failed = 0;
const pending: Promise<void>[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
  pending.push(
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed++;
        console.log("  ✓ " + name);
      })
      .catch((err: unknown) => {
        failed++;
        console.error("  ✗ " + name);
        console.error("    " + (err instanceof Error ? err.message : String(err)));
      }),
  );
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function response(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

console.log("Instagram Follow Gate — API verification");

test("Meta true is the only value that becomes verified", async () => {
  const result = await checkInstagramUserFollow("igsid_1", {
    accessToken: "token",
    fetchImpl: async () => response({ is_user_follow_business: true }),
  });
  assert(result.status === "verified", "true -> verified");
});

test("Meta false remains not_verified", async () => {
  const result = await checkInstagramUserFollow("igsid_1", {
    accessToken: "token",
    fetchImpl: async () => response({ is_user_follow_business: false }),
  });
  assert(result.status === "not_verified", "false -> not_verified");
});

test("Meta API error never unlocks the user", async () => {
  const result = await checkInstagramUserFollow("igsid_1", {
    accessToken: "token",
    fetchImpl: async () => response({ error: { message: "Permission denied" } }, false, 403),
  });
  assert(result.status === "unknown", "API error -> unknown");
  assert(result.reason === "Permission denied", "safe API reason preserved");
});

console.log("Instagram Follow Gate — message payload");

test("Follow Gate contains the Follow URL and verification postback", async () => {
  let body: unknown = null;
  const result = await sendFollowGateMessage("igsid_1", "token", {
    commentId: "comment_1",
    instagramBusinessId: "ig_business_1",
    fetchImpl: async (_input, init) => {
      body = init?.body ? JSON.parse(String(init.body)) : null;
      return response({ message_id: "follow_dm_1" });
    },
  });

  assert(result.success === true, "follow gate send succeeds");
  assert(result.externalId === "follow_dm_1", "message id returned");
  const payload = body as {
    recipient?: { comment_id?: string };
    message?: { attachment?: { payload?: { buttons?: Array<Record<string, string>> } } };
  };
  assert(payload.recipient?.comment_id === "comment_1", "initial gate uses original comment id");
  const buttons = payload.message?.attachment?.payload?.buttons ?? [];
  assert(buttons.length === 2, "two gate buttons");
  assert(buttons[0].type === "web_url" && buttons[0].url === HIRE_DAILY_INSTAGRAM_URL, "Follow button URL");
  assert(buttons[1].type === "postback" && buttons[1].payload === FOLLOW_GATE_PAYLOAD, "I've Followed postback");
});

test("Messaging postback uses message.mid as eventId and sender.id as IGSID", () => {
  const events = parseWebhookEvents({
    object: "instagram",
    entry: [{
      id: "ig_business_1",
      messaging: [{
        sender: { id: "igsid_123" },
        recipient: { id: "ig_business_1" },
        timestamp: 1700000000000,
        message: { mid: "mid_123" },
        postback: { title: "I've Followed ✅", payload: FOLLOW_GATE_PAYLOAD },
      }],
    }],
  });
  const event = events[0];
  assert(event.eventType === "message_interaction", "postback is a messaging interaction");
  assert(event.messageId === "mid_123", "postback.mid is preserved as messageId");
  assert(event.eventId.startsWith("postback_1700000000000_igsid_123_mid_123_"), "postback gets a per-interaction id");
  assert(event.userId === "igsid_123", "sender.id is IGSID");
  assert(event.username === null, "username remains null for messaging events");
  assert(event.interactionPayload === FOLLOW_GATE_PAYLOAD, "payload parsed");
});

test("Two taps on the same postback message get different idempotency ids", () => {
  const make = (timestamp: number) => parseWebhookEvents({
    object: "instagram",
    entry: [{
      id: "ig_business_1",
      messaging: [{
        sender: { id: "igsid_123" },
        recipient: { id: "ig_business_1" },
        timestamp,
        postback: { title: "I've Followed ✅", payload: FOLLOW_GATE_PAYLOAD, mid: "mid_same_button" },
      }],
    }],
  })[0];
  const first = make(1700000000000);
  const second = make(1700000005000);
  assert(first.eventId !== second.eventId, "separate taps are not deduped as one interaction");
  assert(first.messageId === second.messageId, "the original button message id remains the same");
});

test("Echo/self messaging interaction is ignored by the parser", () => {
  const events = parseWebhookEvents({
    object: "instagram",
    entry: [{
      messaging: [{
        sender: { id: "hire_daily" },
        timestamp: 1700000000000,
        is_self: true,
        message: { mid: "mid_self", is_echo: true },
        postback: { title: "I've Followed ✅", payload: FOLLOW_GATE_PAYLOAD },
      }],
    }],
  });
  const event = events[0];
  assert(event.isEcho === true && event.isSelf === true, "self flags preserved");
  assert(event.eventType === "unknown", "self event not treated as user interaction");
});

await Promise.all(pending);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`Follow Gate tests: ${passed} passed`);
}
