import type { InactivityNoticeStage } from "./archive";

export type InactivityNoticeEmailInput = {
  locale: "es" | "en";
  displayName: string;
  stage: InactivityNoticeStage;
  releaseAt: Date;
  loginUrl: string;
  settingsUrl: string;
};

const STAGE_LABEL = {
  es: {
    months_3: "quedan 3 meses",
    months_2: "quedan 2 meses",
    months_1: "queda 1 mes",
    weeks_2: "quedan 2 semanas",
  },
  en: {
    months_3: "3 months left",
    months_2: "2 months left",
    months_1: "1 month left",
    weeks_2: "2 weeks left",
  },
} as const;

function formatDate(value: Date, locale: "es" | "en") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(value);
}

export function inactivityNoticeEmail(input: InactivityNoticeEmailInput) {
  const name = input.displayName.trim() || (input.locale === "es" ? "Hola" : "Hello");
  const date = formatDate(input.releaseAt, input.locale);
  const remaining = STAGE_LABEL[input.locale][input.stage];
  const copy = input.locale === "es"
    ? {
        subject: `Tu historia se publicará en el archivo: ${remaining}`,
        eyebrow: "Archivo de vidas",
        title: `Si no entras a tu cuenta, publicaremos tu historia el ${date}.`,
        body: `${name}, llevas tiempo sin abrir Your Life Story. Activaste la publicación automática por silencio, así que tu vida —experiencias, aprendizajes, familia y archivos— se hará pública en el archivo y se marcará como fallecida.`,
        action: "Si no quieres que se publique, entra ahora a tu cuenta. Eso cuenta como actividad, reinicia el contador y aplazamos la publicación.",
        button: "Entrar a mi cuenta",
        settings: "Abrir ajustes",
        footer: "Si no quieres que esto ocurra nunca, puedes desactivar la publicación automática por silencio al final de Ajustes. Mientras esa opción esté activa, te avisaremos 3 meses, 2 meses, 1 mes y 2 semanas antes de publicar.",
        preheader: `Aviso: ${remaining} para publicar tu historia en el archivo.`,
      }
    : {
        subject: `Your story will be published in the archive: ${remaining}`,
        eyebrow: "Life archive",
        title: `If you do not sign in, we will publish your story on ${date}.`,
        body: `${name}, you have not opened Your Life Story for a while. You turned on automatic publication after silence, so your life —experiences, lessons, family and files— will become public in the archive and be marked as deceased.`,
        action: "If you do not want it published, sign in to your account now. That counts as activity, resets the timer and postpones publication.",
        button: "Sign in to my account",
        settings: "Open settings",
        footer: "If you never want this to happen, you can turn off automatic publication after silence at the bottom of Settings. While that option is on, we will warn you 3 months, 2 months, 1 month and 2 weeks before publishing.",
        preheader: `Notice: ${remaining} before your story is published in the archive.`,
      };

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#faf7f0;color:#24312b;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf9;border:1px solid #e9e4da;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="background:#244a36;padding:28px 32px;color:#edf3e9;">
              <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#b8d2ae;">${escapeHtml(copy.eyebrow)}</p>
              <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;letter-spacing:-0.03em;">Your Life Story</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0;display:inline-block;background:#fff4ec;color:#8a5a3d;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(remaining)}</p>
              <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;letter-spacing:-0.03em;color:#24312b;">${escapeHtml(copy.title)}</h1>
              <p style="margin:18px 0 0;font-size:16px;line-height:1.7;color:#68756d;">${escapeHtml(copy.body)}</p>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#24312b;font-weight:700;">${escapeHtml(copy.action)}</p>
              <p style="margin:28px 0 0;">
                <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#244a36;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:15px;font-weight:700;">${escapeHtml(copy.button)}</a>
              </p>
              <p style="margin:16px 0 0;">
                <a href="${escapeHtml(input.settingsUrl)}" style="color:#3d654c;font-size:14px;font-weight:700;">${escapeHtml(copy.settings)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <div style="border-top:1px solid #e9e4da;padding-top:20px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#68756d;">${escapeHtml(copy.footer)}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    copy.title,
    "",
    copy.body,
    copy.action,
    "",
    `${copy.button}: ${input.loginUrl}`,
    `${copy.settings}: ${input.settingsUrl}`,
    "",
    copy.footer,
  ].join("\n");

  return { subject: copy.subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
