const { Resend } = require('resend');

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('\n──────────────────────────────────────────────');
    console.log(' PASSWORD RESET LINK  (RESEND_API_KEY not set)');
    console.log(`  To:  ${to}`);
    console.log(`  URL: ${resetUrl}`);
    console.log('──────────────────────────────────────────────\n');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM || 'TechVolt SCM <onboarding@resend.dev>';
  const year   = new Date().getFullYear();

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Reset your TechVolt SCM password',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#0d1f3c;padding:28px 36px;text-align:center">
            <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">
              ⚡ TechVolt <span style="color:#0e9f99">SCM</span>
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 24px">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0d1f3c">
              Reset your password
            </h2>
            <p style="margin:0 0 24px;font-size:14.5px;color:#64748b;line-height:1.6">
              Hi ${name}, we received a request to reset the password for your TechVolt SCM account.
              Click the button below — this link expires in <strong>1 hour</strong>.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${resetUrl}"
                style="display:inline-block;background:#0e9f99;color:#ffffff;font-weight:700;
                       font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;
                       letter-spacing:0.2px">
                Reset my password →
              </a>
            </div>
            <p style="margin:24px 0 0;font-size:12.5px;color:#94a3b8;line-height:1.6">
              If you didn't request this, you can safely ignore this email.
              Your password won't change until you click the link above.<br><br>
              Or copy this URL into your browser:<br>
              <span style="color:#0e9f99;word-break:break-all">${resetUrl}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:18px 36px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;font-size:11.5px;color:#94a3b8">
              © ${year} TechVolt SCM · This is an automated message, please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

module.exports = { sendPasswordResetEmail };
