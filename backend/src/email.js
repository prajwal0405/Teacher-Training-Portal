import nodemailer from "nodemailer";
import { PortalSetting } from "./models/PortalSetting.js";
import mongoose from "mongoose";

/**
 * Load SMTP config from the PortalSetting collection.
 * Returns null if SMTP is not configured.
 */
async function getSmtpConfig() {
  const keys = ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "fromEmail", "fromName"];
  const docs = await PortalSetting.find({ key: { $in: keys } });
  const map = {};
  docs.forEach((d) => { map[d.key] = d.value; });

  // Fallback to environment variables
  if ((!map.smtpHost || !map.smtpUser || !map.smtpPass)) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      return {
        host: String(process.env.SMTP_HOST),
        port: Number(process.env.SMTP_PORT) || 587,
        user: String(process.env.SMTP_USER),
        pass: String(process.env.SMTP_PASS),
        fromEmail: String(process.env.FROM_EMAIL || process.env.SMTP_USER),
        fromName: String(process.env.FROM_NAME || "SpacECE Notifications"),
      };
    }
    return null;
  }

  return {
    host: String(map.smtpHost),
    port: Number(map.smtpPort) || 587,
    user: String(map.smtpUser),
    pass: String(map.smtpPass),
    fromEmail: String(map.fromEmail || map.smtpUser),
    fromName: String(map.fromName || "SpacECE Notifications"),
  };
}

/**
 * Send an email to a single recipient using the portal's SMTP config.
 * Returns { success: boolean, error?: string }.
 */
export async function sendEmail({ to, subject, html }) {
  try {
    const config = await getSmtpConfig();
    if (!config) {
      return { success: false, error: "SMTP not configured. Set SMTP settings in Settings & Roles > Email." };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html: html || subject,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[email] send_error", JSON.stringify({ to, subject, error: error.message }));
    return { success: false, error: error.message || "Unknown email error" };
  }
}

/**
 * Send bulk emails to multiple recipients.
 * Returns an array of results, one per recipient.
 */
export async function sendBulkEmails({ recipients, subject, body }) {
  const html = body
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const results = await Promise.allSettled(
    recipients.map(async (r) => {
      const result = await sendEmail({ to: r.email, subject, html });
      return { recipientId: r._id, email: r.email, ...result };
    })
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { recipientId: null, success: false, error: r.reason?.message || "Failed to send" }
  );
}

/**
 * Send notification email and create in-app notification
 */
export async function sendNotificationEmail({ recipient, title, body, category = "system" }) {
  const teacher = await (await import("./models/User.js")).User.findById(recipient).select("name email");
  
  if (!teacher || !teacher.email) {
    return { success: false, error: "Recipient has no email address" };
  }

  // Create in-app notification
  const Notification = (await import("./models/Notification.js")).Notification;
  const notification = await Notification.create({
    recipient,
    channel: "email",
    title,
    body,
    status: "pending",
    metadata: { category, priority: "normal" },
  });

  // Send email if SMTP is configured
  const config = await getSmtpConfig();
  if (config) {
    const result = await sendEmail({
      to: teacher.email,
      subject: title,
      html: `<h2>${title}</h2><p>${body}</p><p><a href="http://localhost:5173">Open SpacECE Portal</a></p>`,
    });
    
    await Notification.findByIdAndUpdate(notification._id, {
      status: result.success ? "sent" : "failed",
      error: result.error,
      sentAt: result.success ? new Date() : undefined,
    });

    console.log("[email] notification_sent", JSON.stringify({ 
      recipient: teacher.email, 
      title, 
      success: result.success 
    }));
    return result;
  }

  await Notification.findByIdAndUpdate(notification._id, {
    status: "skipped",
    error: "SMTP not configured",
  });

  return { success: false, error: "SMTP not configured" };
}

/**
 * Load Twilio config — first from env vars, then from DB as fallback.
 */
export async function getTwilioConfig() {
  // Env vars take priority
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return {
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_FROM_NUMBER,
    };
  }

  // Fall back to DB settings
  const keys = ["twilioSid", "twilioToken", "twilioFrom"];
  const docs = await PortalSetting.find({ key: { $in: keys } });
  const map = {};
  docs.forEach((d) => { map[d.key] = d.value; });

  if (!map.twilioSid || !map.twilioToken || !map.twilioFrom) return null;

  return {
    sid: String(map.twilioSid),
    token: String(map.twilioToken),
    from: String(map.twilioFrom),
  };
}
