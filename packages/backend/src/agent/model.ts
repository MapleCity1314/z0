import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createProviderRegistry, customProvider } from "ai";

function maskHeaderValue(value: string) {
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function normalizeEnvValue(value?: string) {
  if (!value) return undefined;

  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return normalized.length > 0 ? normalized : undefined;
}

function summarizeHeaders(headers: RequestInit["headers"] | undefined) {
  const entries = new Headers(headers).entries();
  return Object.fromEntries(
    Array.from(entries).map(([key, value]) => [
      key,
      key === "authorization" || key === "x-api-key"
        ? maskHeaderValue(value)
        : value,
    ]),
  );
}

function createLoggedFetch(provider: string): typeof fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const isAnthropicProxyRequest =
      provider === "anthropic" &&
      !request.url.startsWith("https://api.anthropic.com/");

    const forwardedHeaders = new Headers(request.headers);

    // Some Anthropic-compatible proxies reject Anthropic beta headers that the AI SDK
    // adds automatically for tool streaming / structured outputs. Claude Code may not
    // send the same beta combination, so normalize proxy requests to a safer baseline.
    if (isAnthropicProxyRequest) {
      forwardedHeaders.delete("anthropic-beta");
    }

    const forwardedRequest = new Request(request, {
      headers: forwardedHeaders,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Model:${provider}] Outbound request`, {
        method: forwardedRequest.method,
        url: forwardedRequest.url,
        headers: summarizeHeaders(forwardedRequest.headers),
      });
    }

    const response = await fetch(forwardedRequest);

    if (!response.ok && process.env.NODE_ENV !== "production") {
      const body = await response.clone().text().catch(() => "");
      console.error(`[Model:${provider}] Outbound response failed`, {
        status: response.status,
        statusText: response.statusText,
        url: forwardedRequest.url,
        body: body.slice(0, 500),
      });
    }

    return response;
  };
}

function normalizeAnthropicBaseURL(baseURL?: string) {
  const cleaned = normalizeEnvValue(baseURL);
  if (!cleaned) return undefined;

  let normalized = cleaned.replace(/\/+$/, "");
  normalized = normalized.replace(/\/messages$/, "");

  if (!normalized.endsWith("/v1")) {
    normalized = `${normalized}/v1`;
  }

  return normalized;
}

function normalizeOpenAICompatibleBaseURL(baseURL?: string) {
  const cleaned = normalizeEnvValue(baseURL);
  if (!cleaned) return undefined;

  let normalized = cleaned.replace(/\/+$/, "");

  if (!normalized.endsWith("/v1")) {
    normalized = `${normalized}/v1`;
  }

  return normalized;
}

function getGoogleProvider() {
  return createGoogleGenerativeAI({
    apiKey: normalizeEnvValue(process.env.GOOGLE_GENERATIVE_AI_API_KEY) ?? "",
    fetch: createLoggedFetch("google"),
  });
}

function getKimiProvider() {
  return createOpenAICompatible({
    name: "kimi",
    apiKey: normalizeEnvValue(process.env.KIMI_API_KEY) ?? "",
    baseURL:
      normalizeOpenAICompatibleBaseURL(process.env.KIMI_BASE_URL) ??
      "https://api.moonshot.cn/v1",
    fetch: createLoggedFetch("kimi"),
  });
}

function getOpenAIProvider() {
  return createOpenAICompatible({
    name: "openai",
    apiKey: normalizeEnvValue(process.env.OPENAI_API_KEY) ?? "",
    baseURL:
      normalizeOpenAICompatibleBaseURL(process.env.OPENAI_BASE_URL) ??
      "https://api.openai.com/v1",
    fetch: createLoggedFetch("openai"),
  });
}

function getAnthropicProvider() {
  const anthropicBaseURL =
    normalizeAnthropicBaseURL(
      process.env.ANTHROPIC_BASE_URL ?? process.env.CLAUDE_BASE_URL,
    ) ?? "https://api.anthropic.com/v1";

  return createAnthropic({
    apiKey:
      normalizeEnvValue(process.env.ANTHROPIC_API_KEY) ??
      normalizeEnvValue(process.env.CLAUDE_API_KEY) ??
      "",
    baseURL: anthropicBaseURL,
    fetch: createLoggedFetch("anthropic"),
  });
}

function createRegistry() {
  const kimi = getKimiProvider();
  const google = getGoogleProvider();
  const openai = getOpenAIProvider();
  const anthropic = getAnthropicProvider();

  const kimiProvider = customProvider({
    languageModels: {
      "k2.5": kimi(process.env.KIMI_CHAT_MODEL ?? "kimi-k2.5"),
      "k2-0905-preview": kimi(
        process.env.KIMI_PRO_MODEL ?? "kimi-k2-0905-preview",
      ),
      thinking: kimi(process.env.KIMI_THINKING_MODEL ?? "kimi-thinking"),
      vision: kimi(
        process.env.KIMI_VISION_MODEL ?? "moonshot-v1-32k-vision-preview",
      ),
    },
    fallbackProvider: kimi,
  });

  const googleProvider = customProvider({
    languageModels: {
      "3.1-flash": google(process.env.GEMINI_FLASH_MODEL ?? "gemini-3.1-flash"),
      "3.1-pro": google(process.env.GEMINI_PRO_MODEL ?? "gemini-3.1-pro"),
    },
    fallbackProvider: google,
  });

  const openAIProvider = customProvider({
    languageModels: {
      codex53: openai(process.env.OPENAI_Z0_PRO_MODEL ?? "gpt-5.3"),
      codex54: openai(process.env.OPENAI_Z0_MAX_MODEL ?? "gpt-5.4"),
    },
    fallbackProvider: openai,
  });

  const claudeProvider = customProvider({
    languageModels: {
      sonnet46: anthropic(process.env.CLAUDE_SONNET_MODEL ?? "claude-sonnet-4-6"),
      opus46: anthropic(process.env.CLAUDE_OPUS_MODEL ?? "claude-opus-4-6"),
    },
    fallbackProvider: anthropic,
  });

  return createProviderRegistry(
    {
      kimi: kimiProvider,
      google: googleProvider,
      openai: openAIProvider,
      claude: claudeProvider,
    },
    { separator: ":" },
  );
}

export const Z0_MODEL_MAP = {
  "z0-mini": {
    standard: "kimi:k2.5",
    thinking: "kimi:thinking",
  },
  "z0-pro": {
    standard: "kimi:k2-0905-preview",
    thinking: "kimi:k2-0905-preview",
  },
  "z0-max": {
    standard: "kimi:k2.5",
    thinking: "kimi:k2.5",
  },
} as const;

export type ModelName = keyof typeof Z0_MODEL_MAP;
export type SelectableModelName = ModelName;

function getResolvedModelIdForAlias(modelId: ProviderLanguageModelId): string {
  const [provider, alias] = modelId.split(":", 2) as [
    ProviderLanguageModelId extends `${infer P}:${string}` ? P : never,
    string,
  ];

  if (provider === "kimi") {
    switch (alias) {
      case "k2.5":
        return process.env.KIMI_CHAT_MODEL ?? "kimi-k2.5";
      case "k2-0905-preview":
        return process.env.KIMI_PRO_MODEL ?? "kimi-k2-0905-preview";
      case "thinking":
        return process.env.KIMI_THINKING_MODEL ?? "kimi-thinking";
      case "vision":
        return process.env.KIMI_VISION_MODEL ?? "moonshot-v1-32k-vision-preview";
      default:
        return alias;
    }
  }

  if (provider === "google") {
    switch (alias) {
      case "3.1-flash":
        return process.env.GEMINI_FLASH_MODEL ?? "gemini-3.1-flash";
      case "3.1-pro":
        return process.env.GEMINI_PRO_MODEL ?? "gemini-3.1-pro";
      default:
        return alias;
    }
  }

  if (provider === "openai") {
    switch (alias) {
      case "codex53":
        return process.env.OPENAI_Z0_PRO_MODEL ?? "gpt-5.3";
      case "codex54":
        return process.env.OPENAI_Z0_MAX_MODEL ?? "gpt-5.4";
      default:
        return alias;
    }
  }

  if (provider === "claude") {
    switch (alias) {
      case "sonnet46":
        return process.env.CLAUDE_SONNET_MODEL ?? "claude-sonnet-4-6";
      case "opus46":
        return process.env.CLAUDE_OPUS_MODEL ?? "claude-opus-4-6";
      default:
        return alias;
    }
  }

  return alias;
}

export function getResolvedModelId(
  modelName: ModelName,
  options?: { isReasoning?: boolean; enableThinking?: boolean },
): string {
  const mapped = Z0_MODEL_MAP[modelName];
  if (!mapped) {
    throw new Error(`Model "${modelName}" not found.`);
  }

  const isReasoning =
    options?.isReasoning ?? options?.enableThinking ?? false;
  const modelId = isReasoning ? mapped.thinking : mapped.standard;
  return getResolvedModelIdForAlias(modelId);
}

export function getTemperatureForModel(
  modelName: ModelName,
  options?: { isReasoning?: boolean; enableThinking?: boolean; fallback?: number },
): number | undefined {
  return getTemperatureForResolvedModelId(
    getResolvedModelId(modelName, options),
    options?.fallback,
  );
}

export function getTemperatureForResolvedModelId(
  modelId: string,
  fallback?: number,
): number | undefined {
  const resolvedModelId = modelId.trim().toLowerCase();

  // GPT-5 and OpenAI reasoning-model families reject custom temperatures and only allow 1.
  if (
    resolvedModelId === "gpt-5" ||
    resolvedModelId.startsWith("gpt-5.") ||
    resolvedModelId.startsWith("gpt-5-") ||
    resolvedModelId === "o1" ||
    resolvedModelId.startsWith("o1-") ||
    resolvedModelId === "o3" ||
    resolvedModelId.startsWith("o3-") ||
    resolvedModelId === "o4" ||
    resolvedModelId.startsWith("o4-")
  ) {
    return undefined;
  }

  return fallback;
}

export const selectableModels: {
  id: SelectableModelName;
  name: string;
  provider: string;
  isReasoning: boolean;
}[] = [
  { id: "z0-mini", name: "z0-mini", provider: "z0", isReasoning: false },
  { id: "z0-pro", name: "z0-pro", provider: "z0", isReasoning: true },
  { id: "z0-max", name: "z0-max", provider: "z0", isReasoning: true },
];

type ProviderRegistry = ReturnType<typeof createProviderRegistry>;
type LanguageModel = ReturnType<ProviderRegistry["languageModel"]>;
type ProviderLanguageModelId =
  | `google:${string}`
  | `kimi:${string}`
  | `openai:${string}`
  | `claude:${string}`;

type RegistryAdapter = {
  languageModel: (modelId: ProviderLanguageModelId) => LanguageModel;
};

type ExportedModel = {
  chat: {
    z0Mini: LanguageModel;
    z0Pro: LanguageModel;
    z0Max: LanguageModel;
  };
  embedding: Record<string, never>;
  vision: {
    kimiVision: LanguageModel;
  };
  reasoning: {
    z0Mini: LanguageModel;
    z0Pro: LanguageModel;
    z0Max: LanguageModel;
  };
};

export function kimi(modelId: string): LanguageModel {
  return getKimiProvider()(modelId);
}

export function getModelFromServer(
  modelName: ModelName,
  options?: { isReasoning?: boolean; enableThinking?: boolean },
): LanguageModel {
  const mapped = Z0_MODEL_MAP[modelName];
  if (!mapped) {
    throw new Error(`Model "${modelName}" not found.`);
  }

  const isReasoning =
    options?.isReasoning ?? options?.enableThinking ?? false;
  const modelId = isReasoning ? mapped.thinking : mapped.standard;
  return createRegistry().languageModel(modelId);
}

export function isReasoningModel(isReasoning: boolean): boolean {
  return isReasoning;
}

export const registry: RegistryAdapter = {
  languageModel(modelId) {
    return createRegistry().languageModel(
      modelId,
    );
  },
};

export const model: ExportedModel = {
  get chat() {
    return {
      z0Mini: getModelFromServer("z0-mini"),
      z0Pro: getModelFromServer("z0-pro"),
      z0Max: getModelFromServer("z0-max"),
    };
  },
  embedding: {},
  get vision() {
    return {
      kimiVision: createRegistry().languageModel("kimi:vision"),
    };
  },
  get reasoning() {
    return {
      z0Mini: getModelFromServer("z0-mini", { isReasoning: true }),
      z0Pro: getModelFromServer("z0-pro", { isReasoning: true }),
      z0Max: getModelFromServer("z0-max", { isReasoning: true }),
    };
  },
};

export default model;
