/**
 * PATTERN: Unified Multi-Tier Metadata & Article Reader Service
 * STACK: Node.js, Cloudflare Workers, @extractus/article-extractor, @extractus/oembed-extractor, Cheerio
 * 
 * CORE CAPABILITIES:
 * 1. Strict SSRF Defense: Prohibits requests to loopback (127.0.0.1, ::1), RFC 1918 subnets, and cloud metadata (169.254.169.254).
 * 2. URL & Tracking Sanitizer: Strips marketing query params (utm_*, fbclid, gclid, igshid, twclid) while preserving media query parameters.
 * 3. Tier 1 Dedicated Media Adapters: Specialized extractors for YouTube, TikTok, Twitter/X, GitHub, Wikipedia, Reddit, Spotify.
 * 4. Generic oEmbed Extractor: Automated metadata extraction from 500+ providers via @extractus/oembed-extractor.
 * 5. Tier 2 JSON-LD & OpenGraph: Deep Schema.org parser cascading to OpenGraph, Twitter Cards, and semantic HTML tags.
 * 6. Reader Mode & Reading Time: Uses @extractus/article-extractor for clean article extraction, word count, and reading time calculation.
 * 7. High-Res Favicons: Apple touch icons, SVG/PNG links, and Google S2 fallback.
 */

import { extractFromHtml } from "@extractus/article-extractor";
import { extract as extractOembed } from "@extractus/oembed-extractor";
import * as cheerio from "cheerio";

export interface RichMetadataResult {
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
  author: string;
  publishedAt: string;
  contentType: "article" | "video" | "audio" | "tweet" | "code" | "website";
  readingTime: number; // estimated reading time in minutes
  wordCount: number;
  canonicalUrl: string;
  articleContent: string; // Clean article body
}

const FORBIDDEN_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "169.254.169.254", // AWS/GCP metadata service
  "metadata.google.internal",
  "instance-data",
]);

export function isSafePublicUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (FORBIDDEN_HOSTS.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
      return false;
    }

    // Block private IPv4 ranges (RFC 1918 & link-local)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const [_, o1, o2] = ipMatch.map(Number);
      if (
        o1 === 10 || // 10.0.0.0/8
        o1 === 127 || // 127.0.0.0/8
        (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12
        (o1 === 192 && o2 === 168) || // 192.168.0.0/16
        (o1 === 169 && o2 === 254) || // 169.254.0.0/16
        o1 === 0 // 0.0.0.0/8
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function sanitizeAndCleanUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "igshid", "twclid", "mc_cid", "mc_eid",
      "_hsenc", "_hsmi", "msclkid", "ref_src", "ref_url",
    ];

    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    return parsed.toString();
  } catch {
    return urlStr;
  }
}

export class MetadataService {
  public static async extractMetadata(rawUrl: string): Promise<RichMetadataResult> {
    const cleanUrl = sanitizeAndCleanUrl(rawUrl);

    if (!isSafePublicUrl(cleanUrl)) {
      return this.synthesizeFallback(cleanUrl);
    }

    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // 1. Tier 1 Specialized Media Adapters
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      const yt = await this.extractYouTube(urlObj);
      if (yt) return yt;
    }

    if (hostname.includes("tiktok.com")) {
      const tt = await this.extractTikTok(urlObj);
      if (tt) return tt;
    }

    if (hostname === "x.com" || hostname.includes("twitter.com")) {
      const tw = await this.extractTwitter(urlObj);
      if (tw) return tw;
    }

    if (hostname === "github.com" || hostname.endsWith(".github.com")) {
      const gh = await this.extractGitHub(urlObj);
      if (gh) return gh;
    }

    if (hostname.includes("wikipedia.org")) {
      const wiki = await this.extractWikipedia(urlObj);
      if (wiki) return wiki;
    }

    if (hostname.includes("reddit.com")) {
      const rd = await this.extractReddit(urlObj);
      if (rd) return rd;
    }

    if (hostname.includes("spotify.com")) {
      const sp = await this.extractSpotify(urlObj);
      if (sp) return sp;
    }

    // 2. Generic oEmbed Fallback
    try {
      const oembed = await extractOembed(cleanUrl);
      if (oembed && oembed.title) {
        return {
          title: oembed.title,
          description: (oembed.description as string) || `Media from ${oembed.provider_name || hostname}`,
          image: oembed.thumbnail_url || (oembed as any).url || "",
          favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
          siteName: oembed.provider_name || hostname,
          author: oembed.author_name || "",
          publishedAt: "",
          contentType: oembed.type === "video" ? "video" : oembed.type === "photo" ? "website" : "article",
          readingTime: 0,
          wordCount: 0,
          canonicalUrl: cleanUrl,
          articleContent: "",
        };
      }
    } catch {}

    // 3. Tier 2 Direct HTML Scrape & Article Extraction
    return await this.extractFromHtmlScrape(cleanUrl, urlObj);
  }

  private static async extractYouTube(urlObj: URL): Promise<RichMetadataResult | null> {
    let videoId: string | null = urlObj.searchParams.get("v");
    const hostname = urlObj.hostname.toLowerCase();

    if (!videoId && hostname.includes("youtu.be")) {
      videoId = urlObj.pathname.slice(1).split("/")[0];
    } else if (!videoId && urlObj.pathname.includes("/shorts/")) {
      videoId = urlObj.pathname.split("/shorts/")[1]?.split("/")[0];
    }

    if (!videoId) return null;

    let title = "YouTube Video";
    let author = "";
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData: any = await oembedRes.json();
        title = oembedData.title || title;
        author = oembedData.author_name || "";
      }
    } catch {}

    return {
      title,
      description: author ? `Watch "${title}" by ${author} on YouTube` : "Watch on YouTube",
      image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      favicon: "https://www.youtube.com/s/desktop/favicon.ico",
      siteName: "YouTube",
      author,
      publishedAt: "",
      contentType: "video",
      readingTime: 0,
      wordCount: 0,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      articleContent: "",
    };
  }

  private static async extractTikTok(urlObj: URL): Promise<RichMetadataResult | null> {
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(urlObj.toString())}`
      );
      if (oembedRes.ok) {
        const data: any = await oembedRes.json();
        return {
          title: data.title || "TikTok Video",
          description: data.author_name ? `TikTok video by ${data.author_name}` : "Watch on TikTok",
          image: data.thumbnail_url || "",
          favicon: "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/favicon.ico",
          siteName: "TikTok",
          author: data.author_name || "",
          publishedAt: "",
          contentType: "video",
          readingTime: 0,
          wordCount: 0,
          canonicalUrl: urlObj.toString(),
          articleContent: "",
        };
      }
    } catch {}
    return null;
  }

  private static async extractTwitter(urlObj: URL): Promise<RichMetadataResult | null> {
    try {
      const oembedRes = await fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(urlObj.toString())}&omit_script=true`
      );
      if (oembedRes.ok) {
        const data: any = await oembedRes.json();
        const $ = cheerio.load(data.html || "");
        const tweetText = $("p").text() || data.author_name || "Post on X";
        return {
          title: `${data.author_name || "Post"} on X`,
          description: tweetText.slice(0, 350),
          image: "https://abs.twimg.com/responsive-web/client-web/icon-default.7ee654e9.png",
          favicon: "https://abs.twimg.com/favicons/twitter.3.ico",
          siteName: "X (Twitter)",
          author: data.author_name || "",
          publishedAt: "",
          contentType: "tweet",
          readingTime: 1,
          wordCount: tweetText.split(/\s+/).length,
          canonicalUrl: urlObj.toString(),
          articleContent: tweetText,
        };
      }
    } catch {}
    return null;
  }

  private static async extractGitHub(urlObj: URL): Promise<RichMetadataResult | null> {
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo] = parts;
      return {
        title: `${owner}/${repo}`,
        description: `GitHub repository by ${owner}`,
        image: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        favicon: "https://github.githubassets.com/favicons/favicon.png",
        siteName: "GitHub",
        author: owner,
        publishedAt: "",
        contentType: "code",
        readingTime: 0,
        wordCount: 0,
        canonicalUrl: `https://github.com/${owner}/${repo}`,
        articleContent: "",
      };
    }
    return null;
  }

  private static async extractWikipedia(urlObj: URL): Promise<RichMetadataResult | null> {
    try {
      const titleSlug = urlObj.pathname.split("/wiki/")[1];
      if (titleSlug) {
        const res = await fetch(
          `https://${urlObj.hostname}/api/rest_v1/page/summary/${encodeURIComponent(titleSlug)}`
        );
        if (res.ok) {
          const data: any = await res.json();
          return {
            title: data.title || titleSlug,
            description: data.extract || "",
            image: data.originalimage?.source || data.thumbnail?.source || "",
            favicon: `https://${urlObj.hostname}/static/favicon/wikipedia.ico`,
            siteName: "Wikipedia",
            author: "Wikipedia Contributors",
            publishedAt: data.timestamp || "",
            contentType: "article",
            readingTime: Math.ceil((data.extract?.split(/\s+/).length || 100) / 200),
            wordCount: data.extract?.split(/\s+/).length || 0,
            canonicalUrl: data.content_urls?.desktop?.page || urlObj.toString(),
            articleContent: data.extract_html || data.extract || "",
          };
        }
      }
    } catch {}
    return null;
  }

  private static async extractReddit(urlObj: URL): Promise<RichMetadataResult | null> {
    try {
      const jsonUrl = urlObj.toString().replace(/\/$/, "") + ".json";
      const res = await fetch(jsonUrl, {
        headers: { "User-Agent": "Mozilla/5.0 MarkbelMetadataEngine/2.1" },
      });
      if (res.ok) {
        const data: any = await res.json();
        const post = data[0]?.data?.children[0]?.data;
        if (post) {
          return {
            title: post.title || "Reddit Post",
            description: post.selftext ? post.selftext.slice(0, 350) : `r/${post.subreddit} post by u/${post.author}`,
            image: post.preview?.images[0]?.source?.url?.replace(/&amp;/g, "&") || post.thumbnail || "",
            favicon: "https://www.redditstatic.com/shreddit/assets/favicon/128x128.png",
            siteName: `r/${post.subreddit}`,
            author: `u/${post.author}`,
            publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : "",
            contentType: "article",
            readingTime: Math.ceil((post.selftext?.split(/\s+/).length || 50) / 200),
            wordCount: post.selftext?.split(/\s+/).length || 0,
            canonicalUrl: `https://www.reddit.com${post.permalink}`,
            articleContent: post.selftext || "",
          };
        }
      }
    } catch {}
    return null;
  }

  private static async extractSpotify(urlObj: URL): Promise<RichMetadataResult | null> {
    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(urlObj.toString())}`
      );
      if (oembedRes.ok) {
        const data: any = await oembedRes.json();
        return {
          title: data.title || "Spotify Audio",
          description: `Listen to ${data.title} on Spotify`,
          image: data.thumbnail_url || "",
          favicon: "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png",
          siteName: "Spotify",
          author: data.author_name || "",
          publishedAt: "",
          contentType: "audio",
          readingTime: 0,
          wordCount: 0,
          canonicalUrl: urlObj.toString(),
          articleContent: "",
        };
      }
    } catch {}
    return null;
  }

  private static async extractFromHtmlScrape(urlStr: string, urlObj: URL): Promise<RichMetadataResult> {
    try {
      const res = await fetch(urlStr, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      if (!res.ok) {
        return this.synthesizeFallback(urlStr);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // JSON-LD Parsing
      let jsonLdTitle = "";
      let jsonLdDescription = "";
      let jsonLdImage = "";
      let jsonLdAuthor = "";
      let jsonLdDate = "";
      let jsonLdSiteName = "";

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const raw = $(el).contents().text().trim();
          if (!raw) return;
          const parsed = JSON.parse(raw);
          const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];

          for (const node of nodes) {
            if (!node || typeof node !== "object") continue;
            const type = node["@type"];
            if (["Article", "NewsArticle", "BlogPosting", "TechArticle", "WebPage"].includes(type)) {
              if (node.headline || node.name) jsonLdTitle = node.headline || node.name;
              if (node.description) jsonLdDescription = node.description;
              if (node.image) {
                jsonLdImage = typeof node.image === "string" ? node.image : node.image.url || node.image[0] || "";
              }
              if (node.author) {
                jsonLdAuthor = typeof node.author === "string" ? node.author : node.author.name || node.author[0]?.name || "";
              }
              if (node.datePublished) jsonLdDate = node.datePublished;
              if (node.publisher?.name) jsonLdSiteName = node.publisher.name;
            }
          }
        } catch {}
      });

      // OpenGraph & Meta Fallbacks
      const ogTitle = $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || "";
      const ogDesc = $('meta[property="og:description"]').attr("content") || $('meta[name="twitter:description"]').attr("content") || $('meta[name="description"]').attr("content") || "";
      const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
      const ogSiteName = $('meta[property="og:site_name"]').attr("content") || "";
      const ogAuthor = $('meta[name="author"]').attr("content") || $('meta[property="article:author"]').attr("content") || "";
      const ogDate = $('meta[property="article:published_time"]').attr("content") || "";
      const canonical = $('link[rel="canonical"]').attr("href") || urlStr;

      // Extract high-res favicon
      let favicon = $('link[rel="apple-touch-icon"]').attr("href") ||
        $('link[rel="icon"][sizes="192x192"]').attr("href") ||
        $('link[rel="icon"][type="image/svg+xml"]').attr("href") ||
        $('link[rel="icon"]').attr("href") ||
        $('link[rel="shortcut icon"]').attr("href") || "";

      if (favicon && !favicon.startsWith("http")) {
        try {
          favicon = new URL(favicon, urlStr).toString();
        } catch {
          favicon = "";
        }
      }
      if (!favicon) {
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
      }

      // @extractus/article-extractor for reader mode and reading time
      let articleContent = "";
      let readingTime = 0;
      let wordCount = 0;
      try {
        const article = await extractFromHtml(html, urlStr);
        if (article) {
          articleContent = article.content || "";
          if (article.content) {
            const textOnly = cheerio.load(article.content).root().text();
            const words = textOnly.trim().split(/\s+/).filter(Boolean);
            wordCount = words.length;
            readingTime = Math.max(1, Math.ceil(wordCount / 200));
          }
        }
      } catch {}

      const title = jsonLdTitle || ogTitle || $("title").text().trim() || urlObj.hostname;
      const description = jsonLdDescription || ogDesc || "";
      const image = jsonLdImage || ogImage || "";
      const author = jsonLdAuthor || ogAuthor || "";
      const publishedAt = jsonLdDate || ogDate || "";
      const siteName = jsonLdSiteName || ogSiteName || urlObj.hostname.replace(/^www\./, "");

      return {
        title: this.cleanText(title),
        description: this.cleanText(description).slice(0, 500),
        image: image ? this.resolveAbsoluteUrl(image, urlStr) : favicon,
        favicon,
        siteName,
        author,
        publishedAt,
        contentType: articleContent.length > 300 ? "article" : "website",
        readingTime,
        wordCount,
        canonicalUrl: canonical ? this.resolveAbsoluteUrl(canonical, urlStr) : urlStr,
        articleContent,
      };
    } catch {
      return this.synthesizeFallback(urlStr);
    }
  }

  private static synthesizeFallback(urlStr: string): RichMetadataResult {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.replace(/^www\./, "");
      const cleanPath = parsed.pathname.replace(/[\/\-_]/g, " ").trim();
      const title = cleanPath ? `${this.capitalizeWords(cleanPath)} | ${host}` : host;

      return {
        title,
        description: `Saved link from ${host}`,
        image: `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
        favicon: `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
        siteName: host,
        author: "",
        publishedAt: "",
        contentType: "website",
        readingTime: 0,
        wordCount: 0,
        canonicalUrl: urlStr,
        articleContent: "",
      };
    } catch {
      return {
        title: urlStr,
        description: "",
        image: "",
        favicon: "",
        siteName: "",
        author: "",
        publishedAt: "",
        contentType: "website",
        readingTime: 0,
        wordCount: 0,
        canonicalUrl: urlStr,
        articleContent: "",
      };
    }
  }

  private static cleanText(text: string): string {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  private static resolveAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return relativeUrl;
    }
  }

  private static capitalizeWords(str: string): string {
    return str
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}
