import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "cpc_session";
const ISSUER = "caribbean-pos-connect";
const AUDIENCE = "cpc-session";

export function sessionSecretKey() {
  const secret = process.env.SESSION_SECRET;
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (production && (!secret || new TextEncoder().encode(secret).length < 32 || /^(dev-secret|ci-only|change-|replace-|development-)/i.test(secret))) {
    throw new Error("A strong SESSION_SECRET of at least 32 bytes is required in production.");
  }
  return new TextEncoder().encode(secret || "development-only-session-key-do-not-deploy");
}

export async function signSession(subject: string, authVersion = "unspecified") {
  return new SignJWT({ authVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(sessionSecretKey());
}

export async function verifySessionClaims(token: string) {
  const { payload } = await jwtVerify(token, sessionSecretKey(), {
    algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE, requiredClaims: ["sub", "iat", "exp", "authVersion"]
  });
  if (!payload.sub || payload.sub.length > 128) throw new Error("Invalid session subject");
  if (typeof payload.authVersion !== "string") throw new Error("Invalid session version");
  return { id: payload.sub, authVersion: payload.authVersion };
}

export async function verifySession(token: string) {
  return (await verifySessionClaims(token)).id;
}
