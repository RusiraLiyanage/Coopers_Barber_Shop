import * as ejs from 'ejs';
import type {
  ForgotPasswordEmailTemplateInput,
  RenderedEmailTemplate,
} from '../email.types';

const forgotPasswordEmailTemplate = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Password reset code</title>
  </head>
  <body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 12px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#111827;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 20px;font-size:15px;line-height:1.6;color:#374151;">
                <p style="margin:0 0 16px;">Hi <%= firstName %>,</p>
                <p style="margin:0;">Use the verification code below to reset your <%= appName %> password.</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 24px;">
                <div style="display:inline-block;padding:14px 22px;border-radius:8px;background:#111827;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:6px;">
                  <%= resetCode %>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-size:14px;line-height:1.6;color:#4b5563;">
                <p style="margin:0 0 12px;">This code expires in <%= expiresInMinutes %> minutes.</p>
                <p style="margin:0;">If you did not request this reset, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const renderForgotPasswordEmailTemplate = (
  input: ForgotPasswordEmailTemplateInput,
): RenderedEmailTemplate => {
  const html = ejs.render(forgotPasswordEmailTemplate, input, {
    rmWhitespace: true,
  });

  return {
    html,
    text: [
      `Hi ${input.firstName},`,
      '',
      `Use this verification code to reset your ${input.appName} password:`,
      input.resetCode,
      '',
      `This code expires in ${input.expiresInMinutes} minutes.`,
      'If you did not request this reset, you can ignore this email.',
    ].join('\n'),
  };
};
