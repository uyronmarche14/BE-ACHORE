type EmailCalloutItem = {
  label: string;
  value: string;
};

type RenderTransactionalEmailParams = {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  bodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
  note: string;
  brandUrl: string;
  calloutTitle?: string;
  calloutItems?: EmailCalloutItem[];
};

export type RenderedTransactionalEmail = {
  subject: string;
  text: string;
  html: string;
};

export function renderTransactionalEmail({
  subject,
  preheader,
  eyebrow,
  title,
  intro,
  bodyParagraphs,
  ctaLabel,
  ctaUrl,
  footer,
  note,
  brandUrl,
  calloutTitle,
  calloutItems = [],
}: RenderTransactionalEmailParams): RenderedTransactionalEmail {
  const escapedSubject = escapeHtml(subject);
  const escapedPreheader = escapeHtml(preheader);
  const escapedEyebrow = escapeHtml(eyebrow);
  const escapedTitle = escapeHtml(title);
  const escapedIntro = escapeHtml(intro);
  const escapedFooter = escapeHtml(footer);
  const escapedNote = escapeHtml(note);
  const escapedCtaLabel = escapeHtml(ctaLabel);
  const escapedBrandUrl = escapeAttribute(brandUrl);
  const escapedCtaUrl = escapeAttribute(ctaUrl);

  const renderedParagraphs = bodyParagraphs
    .map(
      (paragraph) =>
        `<tr><td style="padding-top:0;padding-bottom:14px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#465065;">${escapeHtml(paragraph)}</td></tr>`,
    )
    .join('');

  const renderedCallout =
    calloutTitle && calloutItems.length > 0
      ? `
        <tr>
          <td style="padding-top:10px;padding-bottom:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #e2e8f4;border-radius:14px;background-color:#f6f8fd;">
              <tr>
                <td style="padding:20px 20px 8px 20px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">
                  ${escapeHtml(calloutTitle)}
                </td>
              </tr>
              ${calloutItems
                .map(
                  (item) => `
                    <tr>
                      <td style="padding:0 20px 12px 20px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#334155;">
                        <span style="font-weight:700;color:#0f172a;">${escapeHtml(item.label)}:</span>
                        ${escapeHtml(item.value)}
                      </td>
                    </tr>
                  `,
                )
                .join('')}
            </table>
          </td>
        </tr>
      `
      : '';

  const textSections = [
    subject,
    '',
    intro,
    ...bodyParagraphs.flatMap((paragraph) => ['', paragraph]),
    ...(calloutTitle && calloutItems.length > 0
      ? [
          '',
          `${calloutTitle}:`,
          ...calloutItems.map((item) => `- ${item.label}: ${item.value}`),
        ]
      : []),
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    footer,
    '',
    note,
    '',
    `Archon: ${brandUrl}`,
  ];

  return {
    subject,
    text: textSections.join('\n'),
    html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
    <title>${escapedSubject}</title>
    <style type="text/css">
      body, table, td, p, a, h1 {
        margin: 0;
        padding: 0;
        font-family: Inter, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      }

      table {
        border-collapse: separate;
        border-spacing: 0;
      }

      img {
        border: 0;
        line-height: 100%;
        outline: none;
        text-decoration: none;
      }

      a {
        text-decoration: none;
      }

      .ExternalClass {
        width: 100%;
      }

      .ExternalClass,
      .ExternalClass p,
      .ExternalClass span,
      .ExternalClass td,
      .ExternalClass div {
        line-height: 100%;
      }

      @media screen and (max-width: 480px) {
        .card-shell {
          padding: 32px 22px 28px 22px !important;
          border-radius: 18px !important;
        }

        .content-shell {
          width: 100% !important;
        }

        .eyebrow {
          font-size: 11px !important;
        }

        .title {
          font-size: 24px !important;
          line-height: 32px !important;
        }
      }
    </style>
  </head>
  <body style="width:100%;min-width:100%;background-color:#f4f6fb;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:#f4f6fb;">
      ${escapedPreheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#f4f6fb;">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="content-shell" style="width:100%;max-width:480px;">
            <tr>
              <td class="card-shell" style="border:1px solid #d8dfeb;border-radius:24px;background-color:#ffffff;padding:42px 38px 34px 38px;box-shadow:0 18px 48px rgba(15,23,42,0.06);">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                  <tr>
                    <td style="padding-bottom:30px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" valign="middle" style="width:44px;height:44px;border-radius:14px;background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 100%);font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:20px;line-height:44px;font-weight:700;color:#2563eb;">
                            <a href="${escapedBrandUrl}" style="display:block;color:#2563eb;">A</a>
                          </td>
                          <td style="padding-left:12px;">
                            <a href="${escapedBrandUrl}" style="font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:#0f172a;">Archon</a>
                            <div style="font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:#64748b;">
                              Calm project workspace
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:18px;">
                      <span class="eyebrow" style="display:inline-block;border:1px solid #d7dfeb;border-radius:999px;padding:6px 12px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:14px;font-weight:600;color:#475569;background-color:#f8fafc;">
                        ${escapedEyebrow}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:12px;">
                      <h1 class="title" style="font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.03em;color:#0f172a;">
                        ${escapedTitle}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom:22px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;font-weight:500;color:#475569;">
                      ${escapedIntro}
                    </td>
                  </tr>
                  ${renderedParagraphs}
                  <tr>
                    <td style="padding-top:8px;padding-bottom:0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="border-radius:10px;background-color:#2563eb;">
                            <a href="${escapedCtaUrl}" style="display:inline-block;padding:14px 22px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;">
                              ${escapedCtaLabel}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${renderedCallout}
                  <tr>
                    <td style="padding-top:24px;padding-bottom:12px;font-family:Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#475569;">
                      ${escapedFooter}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-radius:12px;background-color:#f7f8fc;">
                        <tr>
                          <td style="padding:16px 18px;font-family:Albert Sans,Inter,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#667085;text-align:center;">
                            ${escapedNote}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
