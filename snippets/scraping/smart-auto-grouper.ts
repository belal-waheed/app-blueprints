/**
 * PATTERN: Zero-Dependency Domain Auto-Grouper & Platform Categorizer
 * STACK: TypeScript, Node.js, Web, React, Cloudflare Workers
 * 
 * CORE CAPABILITIES:
 * 1. Domain Heuristic Matching: Maps high-frequency media platforms to smart groups:
 *    - YouTube (watch, shorts, youtu.be, music) -> 'YT'
 *    - Instagram (posts, reels, stories, instagr.am) -> 'Insta'
 *    - X / Twitter (posts, status, t.co) -> 'X'
 * 2. Case-Insensitive Scoped Filtering: Respects the user's active vault groups list.
 * 3. Graceful Fallback: Non-matching or deleted groups fall back to 'Unsorted'.
 */

export interface SmartGroupRule {
  name: string;
  color: string;
  patterns: (string | RegExp)[];
}

export const DEFAULT_SMART_GROUPS: SmartGroupRule[] = [
  {
    name: "YT",
    color: "red",
    patterns: [
      "youtube.com",
      "youtu.be",
      "m.youtube.com",
      "music.youtube.com",
    ],
  },
  {
    name: "Insta",
    color: "purple",
    patterns: [
      "instagram.com",
      "instagr.am",
      "ig.me",
    ],
  },
  {
    name: "X",
    color: "slate",
    patterns: [
      "twitter.com",
      "x.com",
      "t.co",
      "mobile.twitter.com",
      "mobile.x.com",
    ],
  },
];

export function extractHostname(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    let formatted = rawUrl.trim().toLowerCase();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = `https://${formatted}`;
    }
    const parsed = new URL(formatted);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return rawUrl.trim().toLowerCase().replace(/^www\./, "");
  }
}

export function resolveSmartGroup(url: string, availableGroups?: string[]): string {
  if (!url || typeof url !== "string") return "Unsorted";

  const hostname = extractHostname(url);
  if (!hostname) return "Unsorted";

  for (const group of DEFAULT_SMART_GROUPS) {
    const isMatch = group.patterns.some((pattern) => {
      if (typeof pattern === "string") {
        return hostname === pattern || hostname.endsWith(`.${pattern}`);
      }
      return pattern.test(hostname);
    });

    if (isMatch) {
      if (availableGroups && availableGroups.length > 0) {
        const groupExists = availableGroups.some(
          (g) => g.toLowerCase() === group.name.toLowerCase()
        );
        if (groupExists) {
          const matchedName = availableGroups.find(
            (g) => g.toLowerCase() === group.name.toLowerCase()
          );
          return matchedName || group.name;
        }
      } else {
        return group.name;
      }
    }
  }

  return "Unsorted";
}
