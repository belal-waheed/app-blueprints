# ⚡ Offline-First PWA Multi-Device Sync Template

Offline-first Progressive Web App starter with Dexie.js (IndexedDB), Last-Write-Wins (LWW) conflict resolution, tombstone deletion persistence, cross-tab `BroadcastChannel`, and Android 12 Web Share Target (`method: 'GET'`).

## 🚀 Quickstart

```bash
# 1. Clone template
npx degit belal-waheed/app-blueprints/templates/pwa-offline-sync my-sync-app
cd my-sync-app

# 2. Install dependencies
npm install

# 3. Start local development
npm run dev
```

## ✨ Features
- **Sub-10ms Local Operations:** All reads and writes hit local IndexedDB first for instant UI response.
- **LWW Conflict Resolution:** Deterministic timestamp-based merging across devices.
- **Tombstone Deletion:** Deleting items creates soft tombstones to prevent resurrected records.
- **Android 12 Share Target:** `method: 'GET'` in manifest for sub-50ms link capturing.
- **Multi-Tab Live Reactivity:** `BroadcastChannel` synchronizes open browser tabs in real-time.
