/**
 * Microlink Headless Anti-Bot & Screenshot Extraction Engine
 * 
 * Provides automated Cloudflare/Akamai anti-bot bypass, OpenGraph extraction,
 * and high-resolution page viewport screenshots via Microlink REST API.
 */

export interface MicrolinkExtractionResult {
  title: string;
  description: string;
  image: string;
  logo: string;
  publisher: string;
  author: string;
  date: string;
  isScreenshot: boolean;
}

export async function fetchWithMicrolink(
  targetUrl: string,
  apiKey?: string,
  timeoutMs: number = 4500
): Promise<MicrolinkExtractionResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'User-Agent': 'MicrolinkAgent/2.1',
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  try {
    const encoded = encodeURIComponent(targetUrl);
    // 1. Initial metadata + palette request
    const res = await fetch(`https://api.microlink.io?url=${encoded}&palette=true`, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const body: any = await res.json();
    if (body.status !== 'success' || !body.data) return null;

    const data = body.data;
    let imageUrl = data.image?.url || '';
    let isScreenshot = false;

    // 2. If OpenGraph image is missing (e.g., text post or bot wall), capture rendered viewport screenshot
    if (!imageUrl) {
      try {
        const shotRes = await fetch(`https://api.microlink.io?url=${encoded}&screenshot=true&meta=false`, {
          headers,
          signal: controller.signal,
        });
        if (shotRes.ok) {
          const shotBody: any = await shotRes.json();
          if (shotBody.data?.screenshot?.url) {
            imageUrl = shotBody.data.screenshot.url;
            isScreenshot = true;
          }
        }
      } catch {}
    }

    if (!imageUrl && data.logo?.url) {
      imageUrl = data.logo.url;
    }

    return {
      title: data.title || '',
      description: data.description || '',
      image: imageUrl,
      logo: data.logo?.url || '',
      publisher: data.publisher || '',
      author: data.author || '',
      date: data.date || '',
      isScreenshot,
    };
  } catch (err) {
    console.warn('[Microlink Extraction Error]:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
