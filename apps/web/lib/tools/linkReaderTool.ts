import { tool } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";

interface CrawlResult {
  url: string;
  ok: boolean;
  title?: string | null;
  description?: string | null;
  text?: string;
  links?: string[];
  html?: string;
  error?: string;
  children?: CrawlResult[];
}

const inputSchema = z.object({
  url: z.string().url().describe("要读取的网页链接"),
  includeRawHtml: z.boolean().default(false)
    .describe("是否返回原始HTML，默认不返回以节省tokens"),
  maxDepth: z.number().default(0)
    .describe("递归爬取深度。0表示只爬当前页面"),
  timeout: z.number().default(8000)
    .describe("最大请求毫秒数，超时会自动失败"),
})

export const linkReaderTool = tool({
  description: "读取网页内容，提取正文、标题、链接和元数据，可用于 AI 爬取互联网内容。",
  inputSchema,

  execute: async ({ url, includeRawHtml, maxDepth }) => {
    const visited = new Set<string>();

    async function crawl(targetUrl: string, depth: number): Promise<CrawlResult | null> {
      if (visited.has(targetUrl)) return null;
      visited.add(targetUrl);

      let res: Response;
      try {
        res = await fetch(targetUrl, { redirect: "follow" });
      } catch (err) {
        return {
          url: targetUrl,
          ok: false,
          error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      const finalUrl = res.url;
      const html = await res.text();

      const $ = cheerio.load(html);

      const title =
        $("meta[property='og:title']").attr("content") ||
        $("title").text().trim() ||
        null;

      const description =
        $("meta[name='description']").attr("content") || null;

      const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 30000);

      const links = $("a[href]")
        .map((_, el) => $(el).attr("href"))
        .get()
        .filter((href) => href && !href.startsWith("javascript:"));

      const result: CrawlResult = {
        url: finalUrl,
        ok: true,
        title,
        description,
        text: bodyText,
        links,
        html: includeRawHtml ? html : undefined,
      };

      if (depth < maxDepth) {
        result.children = [];
        for (const link of links) {
          try {
            const abs = new URL(link, finalUrl).toString();
            const child = await crawl(abs, depth + 1);
            if (child) result.children.push(child);
          } catch {
            // Ignore invalid URLs
          }
        }
      }

      return result;
    }

    return await crawl(url, 0);
  },
});
