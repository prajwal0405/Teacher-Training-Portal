import { sendEmail, getTwilioConfig } from "../email.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";

/**
 * Unified Multi-Channel Notification Service
 * Supports: In-App, Email, SMS, WhatsApp
 */

// ── Channel Enum ──
const CHANNELS = {
  IN_APP: "in_app",
  EMAIL: "email",
  SMS: "sms",
  WHATSAPP: "whatsapp",
  ALL: "all",
};

// ── Priority Levels ──
const PRIORITY = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
};

// ── Notification Templates (Multi-language) ──
const TEMPLATES = {
  course_assigned: {
    en: { title: "New Course Assigned", body: "A training course has been assigned to you. Please log in to start learning." },
    hi: { title: "नया कोर्स सौंपा गया", body: "आपको एक प्रशिक्षण कोर्स सौंपा गया है। कृपया सीखना शुरू करने के लिए लॉग इन करें।" },
    mr: { title: "नवीन अभ्यासक्रम नियुक्त", body: "तुम्हाला एक प्रशिक्षण अभ्यासक्रम नियुक्त करण्यात आला आहे. शिक्षण सुरू करण्यासाठी कृपया लॉग इन करा." },
    te: { title: "కొత్త కోర్స్ కేటాయించబడింది", body: "మీకు ఒక శిక్షణ కోర్స్ కేటాయించబడింది. దయచేసి నేర్చుకోవడం ప్రారంభించడానికి లాగిన్ అవ్వండి." },
    kn: { title: "ಹೊಸ ಕೋರ್ಸ್ ನಿಯೋಜಿಸಲಾಗಿದೆ", body: "ನಿಮಗೆ ಒಂದು ತರಬೇತಿ ಕೋರ್ಸ್ ನಿಯೋಜಿಸಲಾಗಿದೆ. ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಲು ದಯವಿಟ್ಟು ಲಾಗ್ ಇನ್ ಮಾಡಿ." },
    ta: { title: "புதிய பாடநெறி ஒதுக்கப்பட்டது", body: "உங்களுக்கு ஒரு பயிற்சி பாடநெறி ஒதுக்கப்பட்டுள்ளது. கற்றலைத் தொடங்க தயவுசெய்து உள்நுழையவும்." },
  },
  assignment_submitted: {
    en: { title: "Assignment Submitted", body: "A teacher has submitted an assignment for your review." },
    hi: { title: "असाइनमेंट जमा किया गया", body: "एक शिक्षक ने आपकी समीक्षा के लिए असाइनमेंट जमा किया है।" },
    mr: { title: "असाइनमेंट सादर केले", body: "एक शिक्षकाने तुमच्या पुनरावलोकनासाठी असाइनमेंट सादर केले आहे." },
    te: { title: "అసైన్‌మెంట్ సమర్పించబడింది", body: "ఒక ఉపాధ్యాయుడు మీ సమీక్ష కోసం అసైన్‌మెంట్ సమర్పించారు." },
    kn: { title: "ನಿಯೋಜನೆ ಸಲ್ಲಿಸಲಾಗಿದೆ", body: "ಒಬ್ಬ ಶಿಕ್ಷಕರು ನಿಮ್ಮ ಪರಿಶೀಲನೆಗಾಗಿ ನಿಯೋಜನೆಯನ್ನು ಸಲ್ಲಿಸಿದ್ದಾರೆ." },
    ta: { title: "பணி சமர்ப்பிக்கப்பட்டது", body: "ஒரு ஆசிரியர் உங்கள் மதிப்பாய்வுக்காக ஒரு பணியை சமர்ப்பித்துள்ளார்." },
  },
  attendance_reminder: {
    en: { title: "Attendance Reminder", body: "Please mark your attendance for today. Don't forget to check in!" },
    hi: { title: "उपस्थिति अनुस्मारक", body: "कृपया आज अपनी उपस्थिति दर्ज करें। चेक इन करना न भूलें!" },
    mr: { title: "हजेरी स्मरण", body: "कृपया आज तुमची हजेरी नोंदवा. चेक इन करायला विसरू नका!" },
    te: { title: "హాజరు రిమైండర్", body: "దయచేసి ఈ రోజు మీ హాజరు గుర్తించండి. చెక్ ఇన్ చేయడం మరచిపోవద్దు!" },
    kn: { title: "ಹಾಜರಾತಿ ನೆನಪಿಸುವಿಕೆ", body: "ದಯವಿಟ್ಟು ಇಂದು ನಿಮ್ಮ ಹಾಜರಾತಿಯನ್ನು ಗುರುತಿಸಿ. ಚೆಕ್ ಇನ್ ಮಾಡಲು ಮರೆಯಬೇಡಿ!" },
    ta: { title: "வருகை நினைவூட்டல்", body: "தயவுசெய்து இன்றைய உங்கள் வருகையைக் குறிக்கவும். செக் இன் செய்ய மறக்காதீர்கள்!" },
  },
  assignment_reviewed: {
    en: { title: "Assignment Reviewed", body: "Your assignment has been reviewed. Check your grades and feedback." },
    hi: { title: "असाइनमेंट की समीक्षा की गई", body: "आपके असाइनमेंट की समीक्षा कर ली गई है। अपने ग्रेड और प्रतिक्रिया देखें।" },
    mr: { title: "असाइनमेंटचे पुनरावलोकन केले", body: "तुमच्या असाइनमेंटचे पुनरावलोकन केले आहे. तुमचे गुण आणि अभिप्राय पहा." },
    te: { title: "అసైన్‌మెంట్ సమీక్షించబడింది", body: "మీ అసైన్‌మెంట్ సమీక్షించబడింది. మీ గ్రేడ్లు మరియు అభిప్రాయం చూడండి." },
    kn: { title: "ನಿಯೋಜನೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ", body: "ನಿಮ್ಮ ನಿಯೋಜನೆಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಗ್ರೇಡ್‌ಗಳು ಮತ್ತು ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ." },
    ta: { title: "பணி மதிப்பாய்வு செய்யப்பட்டது", body: "உங்கள் பணி மதிப்பாய்வு செய்யப்பட்டுள்ளது. உங்கள் தர மதிப்புகள் மற்றும் கருத்தைச் சரிபார்க்கவும்." },
  },
  password_reset_otp: {
    en: { title: "Password Reset OTP", body: "Your OTP for password reset is: {{otp}}. Valid for {{minutes}} minutes." },
    hi: { title: "पासवर्ड रीसेट OTP", body: "पासवर्ड रीसेट के लिए आपका OTP है: {{otp}}। {{minutes}} मिनट के लिए मान्य।" },
    mr: { title: "पासवर्ड रीसेट OTP", body: "पासवर्ड रीसेटसाठी तुमचा OTP आहे: {{otp}}। {{minutes}} मिनिटांसाठी वैध." },
    te: { title: "పాస్‌వర్డ్ రీసెట్ OTP", body: "పాస్‌వర్డ్ రీసెట్ కోసం మీ OTP: {{otp}}. {{minutes}} నిమిషాలు చెల్లుబాటు అవుతుంది." },
    kn: { title: "ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್ OTP", body: "ಪಾಸ್‌ವರ್ಡ್ ರೀಸೆಟ್‌ಗಾಗಿ ನಿಮ್ಮ OTP: {{otp}}. {{minutes}} ನಿಮಿಷಗಳು ಮಾನ್ಯ." },
    ta: { title: "கடவுச்சொல் மீட்டமைப்பு OTP", body: "கடவுச்சொல் மீட்டமைப்புக்கான உங்கள் OTP: {{otp}}. {{minutes}} நிமிடங்கள் செல்லுபடியாகும்." },
  },
  new_notification: {
    en: { title: "New Notification", body: "{{message}}" },
    hi: { title: "नई सूचना", body: "{{message}}" },
    mr: { title: "नवीन सूचना", body: "{{message}}" },
    te: { title: "కొత్త అధిసూచన", body: "{{message}}" },
    kn: { title: "ಹೊಸ ಅಧಿಸೂಚನೆ", body: "{{message}}" },
    ta: { title: "புதிய அறிவிப்பு", body: "{{message}}" },
  },
};

// ── Helper: Get template in user's preferred language ──
function getTemplate(templateKey, lang = "en", replacements = {}) {
  const langCode = { English: "en", Hindi: "hi", Marathi: "mr", Telugu: "te", Kannada: "kn", Tamil: "ta" }[lang] || "en";
  const template = TEMPLATES[templateKey]?.[langCode] || TEMPLATES[templateKey]?.en || { title: templateKey, body: "" };
  
  let { title, body } = template;
  for (const [key, value] of Object.entries(replacements)) {
    title = title.replace(`{{${key}}}`, value);
    body = body.replace(`{{${key}}}`, value);
  }
  return { title, body };
}

// ── Helper: Normalize phone to E.164 ──
function normalizePhoneE164(phone, defaultCountryCode = "91") {
  if (!phone) return phone;
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.length === 10) return `+${defaultCountryCode}${cleaned}`;
  if (cleaned.length > 10) return `+${cleaned}`;
  return cleaned;
}

// ── Send SMS via Twilio ──
async function sendSms(phone, message) {
  const twilioConf = await getTwilioConfig();
  if (!twilioConf) return { success: false, error: "Twilio not configured" };

  const cleanPhone = normalizePhoneE164(phone);
  const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;

  try {
    const resp = await fetch(twilioBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${twilioConf.sid}:${twilioConf.token}`).toString("base64"),
      },
      body: new URLSearchParams({ To: cleanPhone, From: twilioConf.from, Body: message }).toString(),
    });
    const data = await resp.json();
    return resp.ok ? { success: true, sid: data.sid } : { success: false, error: data.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Send WhatsApp via Twilio ──
async function sendWhatsApp(phone, message) {
  const twilioConf = await getTwilioConfig();
  if (!twilioConf) return { success: false, error: "Twilio not configured" };

  const cleanPhone = normalizePhoneE164(phone);
  const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${twilioConf.sid}/Messages.json`;

  try {
    const resp = await fetch(twilioBase, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${twilioConf.sid}:${twilioConf.token}`).toString("base64"),
      },
      body: new URLSearchParams({
        To: `whatsapp:${cleanPhone}`,
        From: `whatsapp:${twilioConf.from}`,
        Body: message,
      }).toString(),
    });
    const data = await resp.json();
    return resp.ok ? { success: true, sid: data.sid } : { success: false, error: data.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send notification across multiple channels
 * @param {Object} options
 * @param {string} options.recipientId - User ID of recipient
 * @param {string} options.templateKey - Template key from TEMPLATES
 * @param {string} options.channel - "in_app" | "email" | "sms" | "whatsapp" | "all"
 * @param {string} options.priority - "low" | "normal" | "high" | "urgent"
 * @param {Object} options.replacements - Template replacements like { otp: "123456" }
 * @param {Object} options.metadata - Additional metadata
 */
async function sendNotification({ recipientId, templateKey, channel = "in_app", priority = "normal", replacements = {}, metadata = {} }) {
  const recipient = await User.findById(recipientId).select("name email phone language status");
  if (!recipient) return { success: false, error: "Recipient not found" };

  const lang = recipient.language || "English";
  const { title, body } = getTemplate(templateKey, lang, replacements);

  const results = { inApp: null, email: null, sms: null, whatsapp: null };
  const shouldSend = (ch) => channel === "all" || channel === ch;

  // ── In-App Notification ──
  if (shouldSend(CHANNELS.IN_APP)) {
    try {
      const notif = await Notification.create({
        recipient: recipientId,
        channel: "in_app",
        title,
        body,
        status: "delivered",
        sentAt: new Date(),
        metadata: { ...metadata, priority, category: templateKey },
      });
      results.inApp = { success: true, notificationId: notif._id };
    } catch (err) {
      results.inApp = { success: false, error: err.message };
    }
  }

  // ── Email Notification ──
  if (shouldSend(CHANNELS.EMAIL) && recipient.email) {
    try {
      const emailResult = await sendEmail({
        to: recipient.email,
        subject: `SpacECE: ${title}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h2 style="color:#f59e0b;margin:0;">🎓 SpacECE Portal</h2>
            </div>
            <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
              <h3 style="color:#1c1917;margin:0 0 12px;">${title}</h3>
              <p style="color:#374151;font-size:14px;line-height:1.6;">${body}</p>
              <div style="margin-top:20px;text-align:center;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" 
                   style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;text-decoration:none;border-radius:8px;font-weight:700;">
                  Open Portal
                </a>
              </div>
            </div>
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:20px;">
              Sent at ${new Date().toLocaleString("en-IN")} · SpacECE Teacher Training Portal
            </p>
          </div>
        `,
      });

      // Store email notification record
      await Notification.create({
        recipient: recipientId,
        channel: "email",
        title,
        body,
        status: emailResult.success ? "delivered" : "failed",
        error: emailResult.error,
        sentAt: emailResult.success ? new Date() : undefined,
        metadata: { ...metadata, priority, category: templateKey },
      });

      results.email = emailResult;
    } catch (err) {
      results.email = { success: false, error: err.message };
    }
  }

  // ── SMS Notification ──
  if (shouldSend(CHANNELS.SMS) && recipient.phone) {
    try {
      const smsResult = await sendSms(recipient.phone, `${title}\n\n${body}`);
      
      await Notification.create({
        recipient: recipientId,
        channel: "sms",
        title,
        body,
        status: smsResult.success ? "delivered" : "failed",
        error: smsResult.error,
        sentAt: smsResult.success ? new Date() : undefined,
        metadata: { ...metadata, priority, category: templateKey },
      });

      results.sms = smsResult;
    } catch (err) {
      results.sms = { success: false, error: err.message };
    }
  }

  // ── WhatsApp Notification ──
  if (shouldSend(CHANNELS.WHATSAPP) && recipient.phone) {
    try {
      const waResult = await sendWhatsApp(recipient.phone, `${title}\n\n${body}`);
      
      await Notification.create({
        recipient: recipientId,
        channel: "whatsapp",
        title,
        body,
        status: waResult.success ? "delivered" : "failed",
        error: waResult.error,
        sentAt: waResult.success ? new Date() : undefined,
        metadata: { ...metadata, priority, category: templateKey },
      });

      results.whatsapp = waResult;
    } catch (err) {
      results.whatsapp = { success: false, error: err.message };
    }
  }

  const anySuccess = Object.values(results).some(r => r?.success);
  return { success: anySuccess, results };
}

/**
 * Broadcast notification to multiple recipients
 */
async function broadcastNotification({ recipientIds, templateKey, channel = "in_app", priority = "normal", replacements = {}, metadata = {} }) {
  const results = [];
  
  // Process in batches of 10
  for (let i = 0; i < recipientIds.length; i += 10) {
    const batch = recipientIds.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(id => sendNotification({ recipientId: id, templateKey, channel, priority, replacements, metadata }))
    );
    results.push(...batchResults.map((r, idx) => 
      r.status === "fulfilled" ? { recipientId: batch[idx], ...r.value } : { recipientId: batch[idx], success: false, error: r.reason?.message }
    ));
  }

  return {
    total: recipientIds.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

export {
  sendNotification,
  broadcastNotification,
  sendSms,
  sendWhatsApp,
  getTemplate,
  CHANNELS,
  PRIORITY,
  TEMPLATES,
};
