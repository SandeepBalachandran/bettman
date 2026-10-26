import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@fifu.app";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Brand colours (match app/globals.css). Email clients don't support CSS
// variables, so they're inlined here.
const BRAND = {
  background: "#0b0b0b",
  surface: "#161616",
  surface2: "#1f1f1f",
  border: "#2a2a2a",
  accent: "#c6ff00",
  accentForeground: "#0b0b0b",
  text: "#f2f2f2",
  muted: "#a3a3a3",
};

const DISPLAY_FONT = "'Bebas Neue', Impact, 'Arial Narrow', Arial, sans-serif";
const BODY_FONT = "Poppins, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Shared Bettman email shell: dark card, lime check-mark logo, display-font
 * headline, one lime call-to-action button and a copy-paste fallback link.
 * Table-based with inline styles so it renders in Gmail/Outlook/Apple Mail.
 */
export function renderEmail({
  preheader,
  title,
  intro,
  buttonLabel,
  buttonUrl,
  footnotes,
}: {
  preheader: string;
  title: string;
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  footnotes: string[];
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${BRAND.background};" bgcolor="${BRAND.background}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${BRAND.background}" style="background:${BRAND.background};padding:32px 16px;">
<tr><td align="center">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
    <!-- Logo -->
    <tr><td style="padding:0 4px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td width="40" height="40" align="center" valign="middle" bgcolor="${BRAND.accent}" style="width:40px;height:40px;border-radius:20px;background:${BRAND.accent};color:${BRAND.accentForeground};font:700 22px/40px ${BODY_FONT};">&#10003;</td>
        <td style="padding-left:10px;font-family:${DISPLAY_FONT};font-size:30px;line-height:40px;letter-spacing:0.5px;color:${BRAND.text};">BETTMAN</td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td bgcolor="${BRAND.surface}" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:24px;padding:36px 28px;">
      <h1 style="margin:0 0 14px;font-family:${DISPLAY_FONT};font-weight:400;font-size:40px;line-height:1;letter-spacing:0.5px;text-transform:uppercase;color:${BRAND.text};">${title}</h1>
      <p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:15px;line-height:1.7;color:${BRAND.muted};">${intro}</p>

      <table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
        <td align="center" bgcolor="${BRAND.accent}" style="border-radius:999px;background:${BRAND.accent};">
          <a href="${buttonUrl}" style="display:block;padding:16px 24px;font-family:${BODY_FONT};font-size:15px;font-weight:600;color:${BRAND.accentForeground};text-decoration:none;border-radius:999px;">${buttonLabel}</a>
        </td>
      </tr></table>

      <p style="margin:28px 0 8px;font-family:${BODY_FONT};font-size:13px;color:${BRAND.muted};">Button not working? Paste this link into your browser:</p>
      <div style="background:${BRAND.surface2};border:1px solid ${BRAND.border};border-radius:12px;padding:12px 14px;font-family:${BODY_FONT};font-size:12px;line-height:1.5;word-break:break-all;"><a href="${buttonUrl}" style="color:${BRAND.accent};text-decoration:none;">${buttonUrl}</a></div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-top:1px solid ${BRAND.border};">
        ${footnotes
          .map(
            (note) =>
              `<tr><td style="padding-top:14px;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${BRAND.muted};">${note}</td></tr>`
          )
          .join("")}
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding:24px 8px 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:#6b6b6b;">
      Bettman · Private football prediction game<br>
      <a href="${appUrl}" style="color:#6b6b6b;">${appUrl.replace(/^https?:\/\//, "")}</a>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  try {
    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    // In development without API key, log the link instead
    if (!resend) {
      console.log(
        `[DEV MODE] Verification link for ${email}:\n${verificationLink}`
      );
      return { success: true };
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Verify your email — Bettman",
      text: `Welcome to Bettman!\n\nVerify your email to activate your account:\n${verificationLink}\n\nThis link expires in 24 hours. If you didn't create a Bettman account, you can ignore this email.`,
      html: renderEmail({
        preheader: "Confirm your email to start predicting.",
        title: "Verify your email",
        intro:
          "Welcome to <strong style=\"color:#f2f2f2;\">Bettman</strong>! Confirm your email address to activate your account and start predicting results, picking scorers and climbing the leaderboard.",
        buttonLabel: "Verify email",
        buttonUrl: verificationLink,
        footnotes: [
          "&#9203;&nbsp; This link expires in <strong style=\"color:#f2f2f2;\">24 hours</strong>.",
          "&#128274;&nbsp; Didn't create a Bettman account? You can safely ignore this email.",
        ],
      }),
    });

    if (result.error) {
      throw new Error(`Email send failed: ${result.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Email service error:", error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  try {
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // In development without API key, log the link instead
    if (!resend) {
      console.log(`[DEV MODE] Password reset link for ${email}:\n${resetLink}`);
      return { success: true };
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your password — Bettman",
      text: `Someone asked to reset the password for your Bettman account.\n\nChoose a new password here:\n${resetLink}\n\nThis link expires in 1 hour and can only be used once. If you didn't ask for this, ignore this email — your password won't change.`,
      html: renderEmail({
        preheader: "Choose a new password for your Bettman account.",
        title: "Reset your password",
        intro:
          "We got a request to reset the password for your <strong style=\"color:#f2f2f2;\">Bettman</strong> account. Tap the button below to choose a new one.",
        buttonLabel: "Choose a new password",
        buttonUrl: resetLink,
        footnotes: [
          "&#9203;&nbsp; This link expires in <strong style=\"color:#f2f2f2;\">1 hour</strong> and works only once.",
          "&#128274;&nbsp; Didn't ask for this? Ignore this email — your password won't change.",
        ],
      }),
    });

    if (result.error) {
      throw new Error(`Email send failed: ${result.error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Email service error:", error);
    return { success: false, error };
  }
}
