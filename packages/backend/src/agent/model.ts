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

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Model:${provider}] Outbound request`, {
        method: request.method,
        url: request.url,
        headers: summarizeHeaders(request.headers),
      });
    }

    const response = await fetch(request);

    if (!response.ok && process.env.NODE_ENV !== "production") {
      const body = await response.clone().text().catch(() => "");
      console.error(`[Model:${provider}] Outbound response failed`, {
        status: response.status,
        statusText: response.statusText,
        url: request.url,
        body: body.slice(0, 500),
      });
    }

    return response;
  };
}

function normalizeAnthropicBaseURL(baseURL?: string) {
  if (!baseURL) return undefined;

  let normalized = baseURL.trim().replace(/\/+$/, "");
  normalized = normalized.replace(/\/messages$/, "");

  if (!normalized.endsWith("/v1")) {
    normalized = `${normalized}/v1`;
  }

  return normalized;
}

function getGoogleProvider() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
    fetch: createLoggedFetch("google"),
  });
}

function getKimiProvider() {
  return createOpenAICompatible({
    name: "kimi",
    apiKey: process.env.KIMI_API_KEY ?? "",
    baseURL: process.env.KIMI_BASE_URL ?? "",
    fetch: createLoggedFetch("kimi"),
  });
}

function getAnthropicProvider() {
  const anthropicBaseURL =
    normalizeAnthropicBaseURL(
      process.env.ANTHROPIC_BASE_URL ?? process.env.CLAUDE_BASE_URL,
    ) ?? "https://api.anthropic.com/v1";

  return createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? "",
    baseURL: anthropicBaseURL,
    fetch: createLoggedFetch("anthropic"),
  });
}

function createRegistry() {
  const kimi = getKimiProvider();
  const google = getGoogleProvider();
  const anthropic = getAnthropicProvider();

  const kimiProvider = customProvider({
    languageModels: {
      "k2.5": kimi(process.env.KIMI_CHAT_MODEL ?? "kimi-k2.5"),
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
    standard: "claude:sonnet46",
    thinking: "claude:opus46",
  },
  "z0-max": {
    standard: "claude:sonnet46",
    thinking: "claude:opus46",
  },
} as const;

export type ModelName = keyof typeof Z0_MODEL_MAP;
export type SelectableModelName = ModelName;

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
