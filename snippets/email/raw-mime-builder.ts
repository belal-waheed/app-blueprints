/**
 * PATTERN: RFC 5322 MIME Email Envelope Builder
 * STACK: Cloudflare Workers, Edge Isolates, Node.js
 * 
 * WHY THIS IS CRITICAL:
 * Cloudflare's send_email binding (cloudflare:email EmailMessage) requires a valid
 * RFC 5322 MIME string. Passing a JSON object throws a runtime isolate TypeError.
 */

export function buildRawMimeEmail(
  from: string,
  to: string,
  subject: string,
  html: string,
  plainText: string
): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const base64Html = btoa(unescape(encodeURIComponent(html)));
  const base64Text = btoa(unescape(encodeURIComponent(plainText)));

  return [
    `From: Security Team <${from}>`,
    `To: <${to}>`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Html,
    ``,
    `--${boundary}--`,
  ].join("\r\n");
}
