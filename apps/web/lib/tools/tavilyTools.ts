/**
 * Tavily AI SDK Tools
 * Web search, URL extraction, crawling, and site mapping
 */

// biome-ignore assist/source/organizeImports: <explanation>
import  { 
  tavilySearch, 
  tavilyExtract, 
  tavilyCrawl, 
  tavilyMap 
} from "@tavily/ai-sdk";

// Tavily Search - Real-time web search
export const tavilySearchTool = tavilySearch({
  searchDepth: "advanced",
  includeAnswer: true,
  maxResults: 5,
  includeImages: false,
  includeRawContent: false,
});

// Tavily Extract - Clean content extraction from URLms
export const tavilyExtractTool = tavilyExtract();

// Tavily Crawl - Multi-page website crawling
export const tavilyCrawlTool = tavilyCrawl({
  maxDepth: 2,
  maxPages: 10,
});

// Tavily Map - Website structure mapping
export const tavilyMapTool = tavilyMap({
  maxDepth: 2,
});
