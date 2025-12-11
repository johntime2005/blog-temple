globalThis.process ??= {}; globalThis.process.env ??= {};
function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
async function hmacSha256(secret, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function escapeStringLiteral(str) {
  if (typeof str !== "string") {
    return "";
  }
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\0/g, "\\0").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
function validateString(str, minLength = 1, maxLength = 1e3) {
  return typeof str === "string" && str.length >= minLength && str.length <= maxLength;
}
function validateNumber(num, min, max) {
  return typeof num === "number" && !isNaN(num) && num >= min && num <= max;
}
function getSecureCookieOptions(maxAge = 600) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge,
    path: "/"
  };
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
};
function validateOrigin(origin, host) {
  if (!origin || !host) {
    return false;
  }
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

export { escapeStringLiteral, generateSecureToken, getSecureCookieOptions, hmacSha256, isValidUrl, securityHeaders, timingSafeEqual, validateNumber, validateOrigin, validateString };
