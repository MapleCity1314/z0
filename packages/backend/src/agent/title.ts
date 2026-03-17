import { generateText, type UIMessage } from "ai";
import { kimi } from "./model";

const DEFAULT_CHAT_TITLE = "New Chat";
const GREETING_CHAT_TITLE = "Greeting";

function extractTextFromUIMessage(message: UIMessage): string {
  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGreetingLikeMessage(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  if (!normalized) return true;

  const greetingPatterns = [
    /^(hi|hello|hey|yo|sup|howdy|hola)\b[!.? ]*$/,
    /^(good (morning|afternoon|evening))\b[!.? ]*$/,
    /^(你好|您好|哈喽|嗨|早上好|下午好|晚上好)[！!。.? ]*$/,
    /^(在吗|在嗎|有人吗|有人嗎)[？? ]*$/,
  ];

  return greetingPatterns.some((pattern) => pattern.test(normalized));
}

function sanitizeGeneratedTitle(title: string, fallback: string): string {
  const cleaned = title
    .replace(/[\r\n\t]/g, " ")
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
    .replace(/[:：]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return fallback;

  return cleaned.length > 80 ? cleaned.slice(0, 80).trim() : cleaned;
}

export async function generateChatTitle(message: UIMessage): Promise<string> {
  const userText = extractTextFromUIMessage(message);

  if (!userText) {
    return DEFAULT_CHAT_TITLE;
  }

  if (isGreetingLikeMessage(userText)) {
    return GREETING_CHAT_TITLE;
  }

  try {
    const { text } = await generateText({
      model: kimi("moonshot-v1-8k"),
      system: [
        "You generate chat titles only.",
        "Output exactly one short title, not a sentence reply.",
        "Do not answer the user.",
        "Do not include quotes or colons.",
        "Max 80 characters.",
      ].join(" "),
      prompt: `User first message:\n${userText}\n\nReturn title only.`,
    });

    return sanitizeGeneratedTitle(text, DEFAULT_CHAT_TITLE);
  } catch {
    return sanitizeGeneratedTitle(userText, DEFAULT_CHAT_TITLE);
  }
}
