# Android 12 Share Sheet: Making Your App #1 Without Clicking "More"

## ⚡ Method 1: Android 12 Native Share Pinning (5 Seconds)
1. **Install PWA:** Open your app in Chrome/Edge on Android 12 -> Tap Menu -> **"Install app"**.
2. Open any app (YouTube, Twitter/X, Reddit, Chrome).
3. Tap **Share** on any link.
4. Scroll to find your app (tap "More" once).
5. **Long-press** (hold 1 sec) on your app icon.
6. Tap **Pin (📌)**.

🎉 Your app is now locked to **Slot #1 (top-left)** permanently in the Android share sheet!

## 📱 Method 2: Bubblewrap TWA Native APK
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://your-domain.com/manifest.webmanifest
bubblewrap build
```
Generates `app-release-signed.apk` with top-priority `android.intent.action.SEND` intent filter.
