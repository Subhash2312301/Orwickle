import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose?: string;
}

class MailerService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.MAIL_MODE === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  private async dispatch(options: MailOptions): Promise<void> {
    if (env.MAIL_MODE === 'console') {
      const divider = '─'.repeat(64);
      console.log('\n' + divider);
      console.log(`\x1b[36m[ORWICKLE NOTARY DISPATCH — ${options.purpose || 'TRANSACTIONAL'}]\x1b[0m`);
      console.log(`Recipient : ${options.to}`);
      console.log(`Subject   : ${options.subject}`);
      console.log(`Timestamp : ${new Date().toISOString()}`);
      console.log(divider);
      console.log(options.text.trim());
      console.log(divider + '\n');
      return;
    }

    if (this.transporter) {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    }
  }

  public async sendVerificationOtp(email: string, code: string): Promise<void> {
    const text = `
ORWICKLE DEALROOM — VERIFICATION CODE
=====================================
Your email verification code for Orwickle is: ${code}

This code will expire in 10 minutes.
If you did not initiate this registration request, please disregard this notice.
`;
    await this.dispatch({
      to: email,
      subject: 'Orwickle — Email Verification Code',
      text,
      purpose: 'SIGNUP_VERIFICATION',
    });
  }

  public async sendLoginOtp(email: string, code: string): Promise<void> {
    const text = `
ORWICKLE DEALROOM — LOGIN AUTHORIZATION CODE
=============================================
Your multi-factor login authorization code is: ${code}

This code will expire in 5 minutes.
Never share this security code with anyone.
`;
    await this.dispatch({
      to: email,
      subject: 'Orwickle — Login Authorization Code',
      text,
      purpose: 'LOGIN_OTP',
    });
  }

  public async sendPasswordReset(email: string, token: string): Promise<void> {
    const text = `
ORWICKLE DEALROOM — PASSWORD RECOVERY DIRECTIVE
==============================================
A password reset was requested for your Orwickle account.

Your single-use password reset authorization token is:
${token}

This authorization token expires in 60 minutes.
If you did not submit this request, no action is necessary.
`;
    await this.dispatch({
      to: email,
      subject: 'Orwickle — Password Reset Authorization',
      text,
      purpose: 'PASSWORD_RESET',
    });
  }

  public async sendAntiEnumerationAlert(email: string): Promise<void> {
    const text = `
ORWICKLE DEALROOM — REGISTRATION ATTEMPT NOTICE
==============================================
A registration attempt was received for this email address.

An active account is already registered under this address. If you forgot your credentials,
please use the password recovery protocol at the login interface.
`;
    await this.dispatch({
      to: email,
      subject: 'Orwickle — Account Registration Notice',
      text,
      purpose: 'ANTI_ENUMERATION_NOTICE',
    });
  }
}

export const mailerService = new MailerService();
