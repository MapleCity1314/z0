import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createProviderRegistry, customProvider } from "ai";

function normalizeAnthropicBaseURL(baseURL?: string) {
  if (!baseURL) return undefined;

  let normalized = baseURL.trim().replace(/\/+$/, "");
  normalized = normalized.replace(/\/messages$/, "");

  if (!normalized.endsWith("/v1")) {
    normalized = `${normalized}/v1`;
  }

  return normalized;
}

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
});

export const kimi = createOpenAICompatible({
  name: "kimi",
  apiKey: process.env.KIMI_API_KEY ?? "",
  baseURL: process.env.KIMI_BASE_URL ?? "",
});

const anthropicBaseURL =
  normalizeAnthropicBaseURL(
    process.env.ANTHROPIC_BASE_URL ?? process.env.CLAUDE_BASE_URL,
  ) ?? "https://api.anthropic.com/v1";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? "",
  baseURL: anthropicBaseURL,
});

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

export const registry: ProviderRegistry = createProviderRegistry(
  {
    kimi: kimiProvider,
    google: googleProvider,
    claude: claudeProvider,
  },
  { separator: ":" },
);

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
  return registry.languageModel(modelId);
}

export function isReasoningModel(isReasoning: boolean): boolean {
  return isReasoning;
}

export const model: {
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
} = {
  chat: {
    z0Mini: registry.languageModel(Z0_MODEL_MAP["z0-mini"].standard),
    z0Pro: registry.languageModel(Z0_MODEL_MAP["z0-pro"].standard),
    z0Max: registry.languageModel(Z0_MODEL_MAP["z0-max"].standard),
  },
  embedding: {},
  vision: {
    kimiVision: registry.languageModel("kimi:vision"),
  },
  reasoning: {
    z0Mini: registry.languageModel(Z0_MODEL_MAP["z0-mini"].thinking),
    z0Pro: registry.languageModel(Z0_MODEL_MAP["z0-pro"].thinking),
    z0Max: registry.languageModel(Z0_MODEL_MAP["z0-max"].thinking),
  },
} as const;

export default model;
type ProviderRegistry = ReturnType<typeof createProviderRegistry>;
type LanguageModel = ReturnType<ProviderRegistry["languageModel"]>;
