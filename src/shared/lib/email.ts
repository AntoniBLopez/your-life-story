export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

function parseSmtpUrl(value: string): Omit<SmtpConfig, "from"> | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "smtp:" && url.protocol !== "smtps:") return null;
    const port = url.port ? Number(url.port) : url.protocol === "smtps:" ? 465 : 587;
    if (!url.hostname || !Number.isInteger(port)) return null;
    return {
      host: url.hostname,
      port,
      secure: url.protocol === "smtps:" || port === 465,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      pass: url.password ? decodeURIComponent(url.password) : undefined,
    };
  } catch {
    return null;
  }
}

export function getSmtpConfig(): SmtpConfig | null {
  const server = process.env.EMAIL_CLIENT_SERVER?.trim();
  const from = process.env.EMAIL_CLIENT_FROM?.trim();
  if (!server || !from) return null;
  const parsed = parseSmtpUrl(server);
  if (!parsed) return null;
  return { ...parsed, from };
}

export function isEmailConfigured() {
  return Boolean(getSmtpConfig());
}

export async function sendMail(email: OutboundEmail) {
  const config = getSmtpConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email] ${email.subject} → ${email.to}\n${email.text}`);
      return true;
    }
    console.error("EMAIL_CLIENT_SERVER / EMAIL_CLIENT_FROM are not configured.");
    return false;
  }

  try {
    const nodemailer = await import("nodemailer");
    const createTransport = nodemailer.createTransport ?? nodemailer.default.createTransport;
    const transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
    await transporter.sendMail({
      from: config.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email", error);
    return false;
  }
}
