import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@fifu.app";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  try {
    // In development without API key, log the link instead
    if (!resend) {
      const verificationLink = `${appUrl}/verify-email?token=${token}`;
      console.log(
        `[DEV MODE] Verification link for ${email}:\n${verificationLink}`
      );
      return { success: true };
    }

    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Verify your email — FIFU",
      html: `
        <!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Verify Your Email</title>
</head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:40px 20px;">
<tr>
<td align="center">

<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08);">

    <!-- Header -->
    <tr>
        <td align="center"
            style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:40px 20px;color:white;">
            <div style="font-size:52px;">🏆</div>

            <h1 style="margin:15px 0 5px;font-size:30px;font-weight:bold;">
                Welcome to Bettman
            </h1>

            <p style="margin:0;font-size:16px;opacity:.9;">
                Your betting journey starts here.
            </p>
        </td>
    </tr>

    <!-- Content -->
    <tr>
        <td style="padding:45px 40px;">

            <h2 style="margin-top:0;color:#111827;font-size:24px;">
                Verify your email address
            </h2>

            <p style="font-size:16px;color:#4B5563;line-height:1.7;">
                Thank you for joining <strong>Bettman</strong>.
                To activate your account and start using the platform,
                please verify your email address by clicking the button below.
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:35px auto;">
                <tr>
                    <td bgcolor="#4F46E5" style="border-radius:8px;">
                        <a href="${verificationLink}"
                           style="
                           display:inline-block;
                           padding:16px 34px;
                           color:#ffffff;
                           text-decoration:none;
                           font-size:16px;
                           font-weight:bold;">
                            Verify Email
                        </a>
                    </td>
                </tr>
            </table>

            <p style="color:#6B7280;font-size:15px;line-height:1.6;">
                If the button doesn't work, copy and paste the following link
                into your browser:
            </p>

            <div style="
                background:#F9FAFB;
                border:1px solid #E5E7EB;
                padding:14px;
                border-radius:8px;
                word-break:break-all;
                font-size:14px;
                color:#374151;">
                ${verificationLink}
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:35px;">
                <tr>
                    <td style="border-top:1px solid #E5E7EB;padding-top:25px;">

                        <table width="100%">
                            <tr>
                                <td width="40" valign="top" style="font-size:22px;">
                                    ⏳
                                </td>
                                <td style="font-size:14px;color:#6B7280;">
                                    This verification link expires in
                                    <strong>24 hours</strong>.
                                </td>
                            </tr>

                            <tr>
                                <td width="40" valign="top" style="font-size:22px;padding-top:12px;">
                                    🔒
                                </td>
                                <td style="font-size:14px;color:#6B7280;padding-top:12px;">
                                    If you didn't create a Bettman account,
                                    you can safely ignore this email.
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>
            </table>

        </td>
    </tr>

    <!-- Footer -->
    <tr>
        <td align="center"
            style="background:#F9FAFB;padding:24px;border-top:1px solid #E5E7EB;">

            <p style="margin:0;font-size:15px;font-weight:bold;color:#111827;">
                Bettman
            </p>

            <p style="margin:8px 0 0;font-size:13px;color:#9CA3AF;">
                Thanks for choosing Bettman.
                We're excited to have you onboard.
            </p>

        </td>
    </tr>

</table>

</td>
</tr>
</table>

</body>
</html>
      `,
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
