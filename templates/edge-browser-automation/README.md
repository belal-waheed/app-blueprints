# 🧪 Microsoft Edge Headless Playwright Test Suite

Pre-configured automated E2E testing harness specifically tuned for Windows Microsoft Edge (`channel: 'msedge'`), popstate modal trapping, and visual regression snapshotting.

## 🚀 Quickstart

```bash
# 1. Clone template
npx degit belal-waheed/app-blueprints/templates/edge-browser-automation my-edge-tests
cd my-edge-tests

# 2. Install dependencies
npm install

# 3. Run Edge tests
npx playwright test
```

## ✨ Features
- Uses pre-installed Windows Microsoft Edge engine without downloading ad-hoc Chromium binaries.
- Back-button navigation tests asserting that modals close without exiting the web app.
- Visual regression snapshot capture.
