import type { UIMessage, UIMessagePart } from "ai";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function calculateTokensFromText(text: string): number {
  if (!text) return 0;

  let tokens = 0;

  const codeIndicators = /[{}[\]();=<>]/g;
  const codeMatches = text.match(codeIndicators);
  const isCode = codeMatches && codeMatches.length > text.length * 0.1;

  if (isCode) {
    tokens = Math.ceil(text.length * 0.8);
  } else {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const numbers = text.match(/\d+/g) || [];
    const punctuation = text.match(/[^\w\s\u4e00-\u9fa5]/g) || [];

    tokens += chineseChars.length * 1.5;
    tokens += englishWords.length * 1.3;
    tokens += numbers.length;
    tokens += punctuation.length * 0.5;
  }

  return Math.ceil(tokens);
}

function extractTextFromPart(part: UIMessagePart<any, any>): string {
  switch (part.type) {
    case "text":
    case "reasoning":
      return part.text ?? "";
    case "source-url":
    case "source-document":
      return part.title ?? "";
    default:
      return "";
  }
}

function extractTextFromUIMessage(message: UIMessage): string {
  return (message.parts || [])
    .map((part) => extractTextFromPart(part))
    .filter(Boolean)
    .join("\n");
}

export function calculateUsageFromUIMessages(
  messages: UIMessage[],
): TokenUsage {
  let promptTokens = 0;
  let completionTokens = 0;

  for (const message of messages) {
    const contentText = extractTextFromUIMessage(message);
    const tokens = calculateTokensFromText(contentText);

    if (message.role === "user" || message.role === "system") {
      promptTokens += tokens;
    } else if (message.role === "assistant") {
      completionTokens += tokens;
    }
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

export function calculateCreditsFromTokens(
  promptTokens: number,
  completionTokens: number,
): number {
  const inputWeight = 1.0;
  const outputWeight = 1.5;

  return Math.ceil(
    (promptTokens * inputWeight + completionTokens * outputWeight) / 1000,
  );
}

export function calculateCostUSD(usage: TokenUsage) {
  const inputCostPer1K = 0.00003;
  const outputCostPer1K = 0.00012;

  const inputUSD = (usage.promptTokens / 1000) * inputCostPer1K;
  const outputUSD = (usage.completionTokens / 1000) * outputCostPer1K;

  return {
    inputUSD,
    outputUSD,
    totalUSD: inputUSD + outputUSD,
  };
}
