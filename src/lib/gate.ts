import { createHmac } from "crypto";

export const GATE_COOKIE = "cs_gate";

// The cookie holds an HMAC of the access password, so it can't be forged
// and rotates automatically if the password or AUTH_SECRET changes.
export function gateToken(): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(process.env.ACCESS_PASSWORD ?? "")
    .digest("hex");
}
