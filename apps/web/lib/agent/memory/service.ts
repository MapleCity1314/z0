/**
 * Memory Service
 * Local database storage plus LLM-assisted extraction.
 */
import {
  addMemory as dbAddMemory,
  getUserMemories as dbGetUserMemories,
  searchMemories as dbSearchMemories,
} from "./queries";
import { extractMemoriesWithLLM, generateWithMemory } from "./mem0";

export interface MemoryItem {
  id: string;
  memory: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export { generateWithMemory };

export async function addMemory(
  userId: string,
  memoryText: string,
  category?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const dbResult = await dbAddMemory({
      userId,
      memoryText,
      category,
      metadata: { source: "chat" },
    });

    return dbResult;
  } catch (error) {
    console.error("[Memory] Add error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add memory",
    };
  }
}

export async function getRelevantMemories(
  userId: string,
  query?: string,
  limit = 10,
): Promise<MemoryItem[]> {
  try {
    const dbResult = query
      ? await dbSearchMemories({ userId, query, limit })
      : await dbGetUserMemories({ userId, limit });

    if (!dbResult.success || !dbResult.data) {
      return [];
    }

    return dbResult.data.map((memory) => ({
      id: memory.id,
      memory: memory.memory,
      category: memory.category || undefined,
      metadata: {
        ...(memory.metadata as Record<string, unknown>),
        source: "local",
      },
      createdAt: memory.createdAt,
    }));
  } catch (error) {
    console.error("[Memory] Get relevant memories error:", error);
    return [];
  }
}

export function formatMemoriesForContext(memories: MemoryItem[]): string {
  if (memories.length === 0) {
    return "";
  }

  const memoryTexts = memories.map((memory, index) => `${index + 1}. ${memory.memory}`).join("\n");

  return `\n\n[User Memory Context]\nThe following are relevant memories about the user:\n${memoryTexts}\n[End of Memory Context]\n`;
}

export async function extractMemoriesFromMessage(
  userId: string,
  message: string,
): Promise<void> {
  if (message.length < 10) {
    return;
  }

  try {
    const memories = await extractMemoriesWithLLM(message);
    if (memories.length === 0) {
      return;
    }

    for (const { memory, category } of memories) {
      await addMemory(userId, memory, category);
    }
  } catch (error) {
    console.error("[Memory] Extraction failed:", error);
  }
}
