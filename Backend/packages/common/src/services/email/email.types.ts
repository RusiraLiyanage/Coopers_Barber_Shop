export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendForgotPasswordEmailInput = {
  to: string;
  resetCode: string;
  expiresInMinutes: number;
  firstName?: string | null;
};

export type ForgotPasswordEmailTemplateInput = {
  appName: string;
  firstName: string;
  resetCode: string;
  expiresInMinutes: number;
};

export type RenderedEmailTemplate = {
  html: string;
  text: string;
};
