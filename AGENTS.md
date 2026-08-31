# AGENTS.md: AI Agent Operating Guidelines & Knowledge Runbook

> **Target Audience:** AI Coding Assistants (Google Antigravity, Claude Code, Cursor, GitHub Copilot, OpenAI Codex).
> **Purpose:** Authoritative rules, API contracts, and implementation blueprints for scaffolding and maintaining applications.

---

## 1. System Guardrails & Non-Negotiables

1. **Zero-Mock System Under Test:** Never mock the core business logic. Test real domain services and API boundaries.
2. **Deterministic MIME Envelope:** Cloudflare Workers' `send_email` binding (`env.Mail_Pass`) requires a strict RFC 5322 multipart MIME string constructed with `new EmailMessage(from, to, rawMime)`. Never pass raw JSON dictionaries to `send_email`.
3. **Web Share Target Method:** Use `method: 'GET'` in PWA manifests (`manifest.webmanifest`) for URL/text sharing. Do not use `POST` unless a custom Service Worker `fetch` interceptor is explicitly provided.
4. **Offline-First Tombstone Deletions:** In Dexie.js and local IndexedDB databases, never hard-delete records locally during sync. Write a tombstone record with `isDeleted: true` and a fresh `updatedAt` timestamp so deletions propagate across devices.
5. **Back-Button Trapping:** In SPAs and PWAs on Android, overlay dialogs (modals, drawers, sidebars) MUST push a synthetic history entry (`history.pushState({ modalOpen: true }, "")`) and listen to `popstate` to close the modal rather than exiting the application.

---

## 2. Quick Prompt Recipes for AI Agents

### Prompt: Add 3-Stage Password Reset Flow
```text
Implement a 3-stage animated password recovery flow using the pattern in belal-waheed/app-blueprints:
1. Frontend: LoginPage with Framer Motion slide variants, 3-step progress pills, and 6-box OtpInput component supporting auto-advance and clipboard paste.
2. Backend: Hono TS endpoints for POST /api/auth/forgot-password (6-digit token, 15-min TTL), POST /api/auth/verify-code, and POST /api/auth/reset-password (PBKDF2 Web Crypto).
3. Email: 3-tier delivery fallback (Cloudflare send_email -> Resend API -> devCode sandbox).
```

### Prompt: Add Offline-First Multi-Device Sync
```text
Implement offline-first client sync using the pattern in belal-waheed/app-blueprints:
1. Dexie.js database with 'bookmarks' and 'groups' tables, indexed on id, userId, updatedAt, isDeleted.
2. SyncManager with Last-Write-Wins (LWW) conflict resolution, BroadcastChannel('app-sync-channel') for cross-tab reactivity, and window.onfocus pull triggers.
3. Web Share Target in vite.config.ts using method: 'GET' routing to /share.
```

---

## 3. Platform Troubleshooting Knowledge Base

| Platform | Error / Symptom | Root Cause | Verified Solution |
| :--- | :--- | :--- | :--- |
| **is-a.dev DNS** | `CNAME cannot end with .workers.dev` | `util/disallowed-cnames.json` blocks `.workers.dev` CNAMEs | Change record to `"URL": "https://<app>.workers.dev"` for a 301 redirect |
| **is-a.dev DNS** | `is not authorized to update` | PR author login doesn't match `owner.username` | Ensure `owner.username` exactly matches lowercase GitHub login |
| **Cloudflare Email** | `TypeError: send is not a function` or invalid format | Passed raw object instead of RFC 5322 MIME | Use `buildRawMimeEmail` helper and pass `new EmailMessage(from, to, mime)` |
| **Android PWA** | Modal closes and exits app on Back gesture | No `popstate` history trapping | Use `useModalBackNavigation` hook |
| **Resend API** | `403 Forbidden: domain not verified` | Sender domain missing DKIM/SPF | Add DNS records to domain registrar or use `onboarding@resend.dev` in dev |
