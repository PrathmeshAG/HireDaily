// The token state shown to the admin and used for alerts: Meta's own answer,
// plus the expiry date the admin entered by hand when Meta cannot report one.

import { checkMetaToken, type TokenState } from "./token-health.service.js";
import { readTokenExpiryNote } from "./firebase-admin.service.js";

export type EffectiveTokenState = TokenState & { expirySource: "meta" | "manual" | null };

export async function getEffectiveTokenState(
  opts: { instagramConnected?: boolean; check?: typeof checkMetaToken; readNote?: typeof readTokenExpiryNote } = {},
): Promise<EffectiveTokenState> {
  const check = opts.check ?? checkMetaToken;
  const readNote = opts.readNote ?? readTokenExpiryNote;
  let state: TokenState = await check();

  // If the Instagram connection check succeeded, Meta accepted the token.
  if (opts.instagramConnected === true && state.valid !== true) {
    state = { ...state, valid: true, error: null };
  }

  let expirySource: EffectiveTokenState["expirySource"] = state.expiresAt ? "meta" : null;
  if (state.expiresAt === null && !state.neverExpires) {
    try {
      const note = await readNote();
      if (note) {
        state = { ...state, expiresAt: note.expiresAt };
        expirySource = "manual";
      }
    } catch {
      // manual note is optional
    }
  }
  return { ...state, expirySource };
}
