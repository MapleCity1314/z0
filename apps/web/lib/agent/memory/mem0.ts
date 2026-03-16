/**
 * Mem0 Memory Integration
 * Using @mem0/vercel-ai-provider for AI SDK integration
 * Docs: https://ai-sdk.dev/providers/community-providers/mem0
 */
import { createMem0 } from "@mem0/vercel-ai-provider";
import { generateText } from "ai";
import { getModelFromServer, type ModelName } from "@/lib/agent/model";

// Initialize Mem0 Provider
export function createMem0Provider(userId: string) {
  const apiKey = process.env.MEM0_API_KEY;

  if (!apiKey) {
    console.warn("[Mem0] API key not found, using local-only mode");
    return null;
  }

  // Create Mem0 provider with user context
  return createMem0({
    apiKey,
    mem0Config: {
      user_id: userId,
    },
  });
}

// LLM-assisted memory extraction
export async function extractMemoriesWithLLM(
  message: string,
): Promise<Array<{ memory: string; category: string }>> {
  try {
    const extractionPrompt = `从用户消息中提取可以长期记住的事实性信息。

要求：
- 只提取明确的事实，不推断
- 不提取敏感信息（除非用户主动提供）
- 分类：personal（个人信息）、preference（偏好）、context（背景）、skill（技能）、goal（目标）
- 输出 JSON 数组格式

用户消息：${message}

输出格式示例：
[
  { "memory": "用户是一名开发者", "category": "personal" },
  { "memory": "用户主要使用 TypeScript 和 Rust", "category": "skill" }
]

如果没有可提取的信息，返回空数组 []`;

    const result = await generateText({
      model: getModelFromServer("z0-mini") as Parameters<
        typeof generateText
      >[0]["model"],
      prompt: extractionPrompt,
      temperature: 0.3,
    });

    // Parse JSON response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const memories = JSON.parse(jsonMatch[0]);
      console.log(`[Mem0] LLM extracted ${memories.length} memories`);
      return memories;
    }

    return [];
  } catch (error) {
    console.error("[Mem0] LLM extraction failed:", error);
    return [];
  }
}

// Generate text with Mem0 memory context
export async function generateWithMemory(
  userId: string,
  prompt: string,
  modelName: ModelName = "z0-mini",
): Promise<{ text: string; memories?: unknown[] }> {
  const mem0 = createMem0Provider(userId);

  if (!mem0) {
    // Fallback to regular generation without memory
    const result = await generateText({
      model: getModelFromServer(modelName) as Parameters<
        typeof generateText
      >[0]["model"],
      prompt,
    });
    return { text: result.text };
  }

  try {
    console.log(
      `[Mem0] Generating with memory context for user ${userId.substring(0, 8)}...`,
    );

    // Use Mem0-wrapped model
    const result = await generateText({
      model: mem0(modelName, { user_id: userId }),
      prompt,
    });

    console.log(`[Mem0] ✅ Generated with memory context`);

    // Get memory sources if available
    const memories = (result as { memories?: unknown[] }).memories;

    return {
      text: result.text,
      memories,
    };
  } catch (error) {
    console.error("[Mem0] ❌ Generation with memory failed:", error);

    // Fallback to regular generation
    const result = await generateText({
      model: getModelFromServer(modelName) as Parameters<
        typeof generateText
      >[0]["model"],
      prompt,
    });
    return { text: result.text };
  }
}

// Add memory through conversation
export async function addMemoryThroughConversation(
  userId: string,
  message: string,
): Promise<{ success: boolean }> {
  const mem0 = createMem0Provider(userId);

  if (!mem0) {
    return { success: false };
  }

  try {
    console.log(
      `[Mem0] Adding memory through conversation for user ${userId.substring(0, 8)}...`,
    );

    // Mem0 automatically extracts and stores memories during generation
    await generateText({
      model: mem0("z0-mini", { user_id: userId }),
      prompt: `Extract and remember key information from this message: ${message}`,
    });

    console.log(`[Mem0] ✅ Memory added through conversation`);
    return { success: true };
  } catch (error) {
    console.error("[Mem0] ❌ Failed to add memory:", error);
    return { success: false };
  }
}

// Get memory sources from last generation
export function getMemorySources(result: { memories?: unknown[] }): unknown[] {
  return result.memories || [];
}
