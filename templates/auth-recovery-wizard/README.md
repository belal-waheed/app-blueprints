# 🔐 3-Stage Animated Password Recovery Wizard Template

A complete, production-grade authentication and password recovery template with Framer Motion slide animations, segmented 6-digit OTP auto-advancing inputs, and Cloudflare/Resend email integration.

## 🚀 Quickstart

```bash
# 1. Clone template
npx degit belal-waheed/app-blueprints/templates/auth-recovery-wizard my-auth-app
cd my-auth-app

# 2. Install dependencies
npm install

# 3. Configure secrets
cp .env.example .env

# 4. Start local development
npm run dev
```

## ✨ Features
- **3-Stage Animated Wizard:** Email Request -> 6-Box OTP Verification -> New Password Creation.
- **Segmented OtpInput:** 6 discrete cells, clipboard paste auto-fill, backspace focus backtrack, auto-submit on 6th digit.
- **3-Tier Delivery Engine:** Cloudflare `send_email` (RFC 5322 MIME) -> Resend API fallback -> On-screen sandbox code.
- **PBKDF2 Web Crypto:** Zero-dependency, edge-compatible password hashing.
- **Password Strength Meter:** Live visual pills evaluating length, numbers, symbols, and casing.

## 📋 Environment Variables
```env
# Required for Cloudflare D1
DB_NAME=auth-db

# Resend Transactional Email (Optional, fallback provided)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL="Security Team <security@your-domain.com>"
```
