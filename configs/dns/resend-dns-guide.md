# Resend DNS Verification Guide (DKIM, SPF, DMARC)

To verify a custom domain (or subdomain like `mail.yourdomain.com`) on Resend:

## 1. DKIM Record
- **Type:** `TXT`
- **Name:** `resend._domainkey` (or `resend._domainkey.subdomain`)
- **Value:** `p=MIGf...` (Copied from Resend dashboard)

## 2. SPF Records (CNAME)
- **Type:** `CNAME`
- **Name:** `rsend.subdomain` -> **Value:** `rsend-euw1.forge.rmta.net`
- **Name:** `send.subdomain` -> **Value:** `send.forge.rmta.net`

## 3. DMARC Record
- **Type:** `TXT`
- **Name:** `_dmarc`
- **Value:** `v=DMARC1; p=none;`
