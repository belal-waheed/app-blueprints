# 🌐 Universal Media & Link Metadata Scraper API

High-speed, multi-tier URL metadata, OpenGraph, and cover image extraction engine for Cloudflare Workers.

## 🚀 Quickstart

```bash
# 1. Clone template
npx degit belal-waheed/app-blueprints/templates/universal-media-scraper my-scraper
cd my-scraper

# 2. Install dependencies
npm install

# 3. Start local development
npm run dev
```

## ✨ Features
- **Dedicated Fast-Paths:** GitHub (repo + social card), Wikipedia summary, YouTube & Spotify oEmbeds, Reddit, AniList GraphQL.
- **Universal HTML Scraper:** Cheerio OpenGraph, Twitter Cards, and Schema.org JSON-LD parser.
- **Anti-Bot Cloud Bypass:** Microlink API fallback for 403-protected pages.
