/**
 * Memory generation helpers.
 *
 * The previous Mem0 provider package is pinned to AI SDK 5 and Zod 3, which is
 * incompatible with this app's AI SDK 6 + Zod 4 stack. Keep the memory module
 * API stable and fall back to local extraction plus standard generation.
 */
import { generateText } from "ai";
import { getModelFromServer, type ModelName } from "@/lib/agent/model";

export function createMem0Provider(_userId: string) {
  return null;
}

export async function extractMemoriesWithLLM(
  message: string,
): Promise<Array<{ memory: string; category: string }>> {
  try {
    const extractionPrompt = `Extract durable user facts from the message below.

Rules:
- Only keep explicit facts.
- Do not infer hidden preferences or private data.
- Use one of these categories: personal, preference, context, skill, goal.
- Return a JSON array.

Message:
${message}

Example:
[
  { "memory": "The user works in TypeScript", "category": "skill" }
]

Return [] when nothing should be stored.`;

    const result = await generateText({
      model: getModelFromServer("z0-mini") as Parameters<typeof generateText>[0]["model"],
      prompt: extractionPrompt,
      temperature: 0.3,
    });

    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (
          item,
        ): item is {
          memory: string;
          category: string;
        } =>
          Boolean(
            item &&
              typeof item === "object" &&
              "memory" in item &&
              "category" in item &&
              typeof item.memory === "string" &&
              typeof item.category === "string",
          ),
      )
      .map((item) => ({
        memory: item.memory.trim(),
        category: item.category.trim(),
      }))
      .filter((item) => item.memory.length > 0 && item.category.length > 0);
  } catch (error) {
    console.error("[Memory] LLM extraction failed:", error);
    return [];
  }
}

export async function generateWithMemory(
  _userId: string,
  prompt: string,
  modelName: ModelName = "z0-mini",
): Promise<{ text: string; memories?: unknown[] }> {
  const result = await generateText({
    model: getModelFromServer(modelName) as Parameters<typeof generateText>[0]["model"],
    prompt,
  });

  return { text: result.text };
}

export async function addMemoryThroughConversation(
  _userId: string,
  _message: string,
): Promise<{ success: boolean }> {
  return { success: false };
}

export function getMemorySources(result: { memories?: unknown[] }): unknown[] {
  return result.memories || [];
}
