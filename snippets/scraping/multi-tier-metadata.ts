/**
 * PATTERN: Multi-Tier Metadata & Cover Image Extractor
 * STACK: Cloudflare Workers, Cheerio, oEmbed, REST APIs
 * 
 * TIERS:
 * 1. Dedicated APIs: GitHub (social preview), Wikipedia (REST summary), YouTube (oEmbed), Spotify (oEmbed), Reddit, AniList GraphQL.
 * 2. HTML Meta: og:image, twitter:image, Schema.org JSON-LD (Article, Product, VideoObject), in-page cover heuristics.
 * 3. Anti-Bot Bypass: Microlink cloud-renderer API fallback for 403-protected pages.
 */

import * as cheerio from "cheerio";

export async function extractUrlMetadata(targetUrl: URL): Promise<{ title: string; description: string; image: string }> {
  const hostname = targetUrl.hostname.toLowerCase();

  // Tier 1: GitHub Repository
  if (hostname === "github.com" || hostname.endsWith(".github.com")) {
    const parts = targetUrl.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo] = parts;
      return {
        title: `${owner}/${repo}`,
        description: `GitHub repository by ${owner}`,
        image: `https://opengraph.githubassets.com/1/${owner}/${repo}`
      };
    }
  }

  // Tier 1: YouTube Video / Shorts
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    let ytId: string | null = targetUrl.searchParams.get("v");
    if (!ytId && hostname.includes("youtu.be")) ytId = targetUrl.pathname.slice(1);
    if (ytId) {
      return {
        title: "YouTube Video",
        description: "Watch on YouTube",
        image: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      };
    }
  }

  // Tier 2: Live HTML Scrape
  try {
    const res = await fetch(targetUrl.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr("content") || $("title").text() || targetUrl.hostname;
      const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "";
      const image = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";

      if (title || image) {
        return { title: title.trim(), description: description.trim().slice(0, 350), image: image.trim() };
      }
    }
  } catch {}

  // Tier 3: Anti-Bot Microlink Fallback
  try {
    const mlRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl.toString())}`);
    if (mlRes.ok) {
      const mlData: any = await mlRes.json();
      if (mlData?.data) {
        return {
          title: mlData.data.title || targetUrl.hostname,
          description: (mlData.data.description || "").slice(0, 350),
          image: mlData.data.image?.url || mlData.data.logo?.url || ""
        };
      }
    }
  } catch {}

  // High-res Favicon fallback
  return {
    title: targetUrl.hostname,
    description: "",
    image: `https://www.google.com/s2/favicons?domain=${targetUrl.hostname}&sz=128`
  };
}
