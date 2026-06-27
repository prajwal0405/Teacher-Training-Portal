import crypto from "crypto";

// ── OTP Configuration ──
const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES, 10) || 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const MAX_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || "spacECE_otp_secret_2026_change_in_prod";

// ── In-memory OTP store ──
// Key: normalized email, Value: { otpHash, expires, attempts }
const otpStore = new Map();

// ── Auto-cleanup expired OTPs every 5 minutes ──
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore) {
    if (record.expires < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

/**
 * Hash OTP with SHA-256 using email + secret.
 * Raw OTP is never stored.
 */
function hashOtp(email, otp) {
  return crypto
    .createHash("sha256")
    .update(`${email.toLowerCase()}:${otp}:${OTP_SECRET}`)
    .digest("hex");
}

/**
 * Generate a 6-digit cryptographically secure OTP.
 */
function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Store OTP in memory with hash, expiry, and attempt tracking.
 * One active OTP per email (new request overwrites previous).
 */
function storeOtp(email, otp) {
  const normalizedEmail = email.toLowerCase();
  otpStore.set(normalizedEmail, {
    otpHash: hashOtp(normalizedEmail, otp),
    expires: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  console.log("[otp] stored", JSON.stringify({
    email: normalizedEmail,
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    ttlMinutes: OTP_TTL_MINUTES,
  }));
}

/**
 * Verify OTP against stored hash.
 * Returns: { valid: boolean, reason?: string }
 */
function verifyOtp(email, otp) {
  const normalizedEmail = email.toLowerCase();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return { valid: false, reason: "no_otp" };
  }

  if (record.expires < Date.now()) {
    otpStore.delete(normalizedEmail);
    return { valid: false, reason: "expired" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalizedEmail);
    return { valid: false, reason: "rate_limited" };
  }

  record.attempts += 1;

  const inputHash = hashOtp(normalizedEmail, otp);
  if (record.otpHash !== inputHash) {
    return { valid: false, reason: "invalid", attemptsLeft: MAX_ATTEMPTS - record.attempts };
  }

  // OTP verified — delete from store
  otpStore.delete(normalizedEmail);
  return { valid: true };
}

/**
 * Delete OTP from store (e.g., after successful password reset).
 */
function deleteOtp(email) {
  otpStore.delete(email.toLowerCase());
}

/**
 * Check if an OTP exists and is valid for the given email.
 */
function hasActiveOtp(email) {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return false;
  if (record.expires < Date.now()) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  return true;
}

export {
  generateOtp,
  storeOtp,
  verifyOtp,
  deleteOtp,
  hasActiveOtp,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
};
