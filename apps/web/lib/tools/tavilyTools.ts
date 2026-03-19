/**
 * Tavily AI SDK Tools
 * Web search, URL extraction, crawling, and site mapping
 */

import {
  tavilySearch,
  tavilyExtract,
  tavilyCrawl,
  tavilyMap,
} from "@tavily/ai-sdk";

function createLazyTool<T extends object>(factory: () => T): T {
  let instance: T | undefined;

  const getInstance = () => {
    instance ??= factory();
    return instance;
  };

  return new Proxy({} as T, {
    get(_target, property, receiver) {
      return Reflect.get(getInstance(), property, receiver);
    },
    has(_target, property) {
      return property in getInstance();
    },
    ownKeys() {
      return Reflect.ownKeys(getInstance());
    },
    getOwnPropertyDescriptor(_target, property) {
      const descriptor = Object.getOwnPropertyDescriptor(getInstance(), property);

      if (!descriptor) {
        return undefined;
      }

      return {
        ...descriptor,
        configurable: true,
      };
    },
  });
}

// Delay Tavily client creation until a tool is actually used so build-time
// imports do not require optional search credentials.
export const tavilySearchTool = createLazyTool(
  () =>
    tavilySearch({
      searchDepth: "advanced",
      includeAnswer: true,
      maxResults: 5,
      includeImages: false,
      includeRawContent: false,
    }),
);

export const tavilyExtractTool = createLazyTool(() => tavilyExtract());

export const tavilyCrawlTool = createLazyTool(
  () =>
    tavilyCrawl({
      maxDepth: 2,
      maxPages: 10,
    }),
);

export const tavilyMapTool = createLazyTool(
  () =>
    tavilyMap({
      maxDepth: 2,
    }),
);
