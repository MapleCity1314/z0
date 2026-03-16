/**
 * Memory Service
 * Hybrid: LLM extraction + Mem0 Provider + Local backup
 */
import {
  addMemory as dbAddMemory,
  getUserMemories as dbGetUserMemories,
  searchMemories as dbSearchMemories,
} from "./queries";
import { 
  extractMemoriesWithLLM, 
  addMemoryThroughConversation,
  generateWithMemory 
} from "./mem0";

export interface MemoryItem {
  id: string;
  memory: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Export Mem0 generation function for use in chat route
export { generateWithMemory };

// Add memory to local database
export async function addMemory(
  userId: string,
  memoryText: string,
  category?: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[Memory] 💾 Adding memory for user ${userId.substring(0, 8)}...`);
    console.log(`[Memory] 📝 Content: "${memoryText.substring(0, 100)}${memoryText.length > 100 ? '...' : ''}"`);
    console.log(`[Memory] 🏷️ Category: ${category || 'none'}`);
    
    const dbResult = await dbAddMemory({
      userId,
      memoryText,
      category,
      metadata: { source: "chat" },
    });

    if (dbResult.success) {
      console.log(`[Memory] ✅ Memory saved successfully`);
    } else {
      console.log(`[Memory] ❌ Failed to save: ${dbResult.message}`);
    }

    return dbResult;
  } catch (error) {
    console.error("[Memory] ❌ Add error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add memory",
    };
  }
}

// Get relevant memories for context
// Note: When using Mem0 Provider, memories are automatically retrieved during generation
// This function is mainly for local DB fallback and manual queries
export async function getRelevantMemories(
  userId: string,
  query?: string,
  limit = 10
): Promise<MemoryItem[]> {
  try {
    console.log(`[Memory] � R etrieving memories for user ${userId.substring(0, 8)}...`);
    if (query) {
      console.log(`[Memory] 🔎 Search query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    }
    
    // Use local DB for manual queries
    // Mem0 Provider will handle automatic memory retrieval during generation
    const dbResult = query
      ? await dbSearchMemories({ userId, query, limit })
      : await dbGetUserMemories({ userId, limit });

    if (dbResult.success && dbResult.data) {
      const memories = dbResult.data.map((m) => ({
        id: m.id,
        memory: m.memory,
        category: m.category || undefined,
        metadata: { ...(m.metadata as Record<string, unknown>), source: "local" },
        createdAt: m.createdAt,
      }));
      
      console.log(`[Memory] ✅ Found ${memories.length} memories from local DB`);
      memories.forEach((m, i) => {
        console.log(`[Memory]   ${i + 1}. [${m.category || 'general'}] ${m.memory.substring(0, 80)}${m.memory.length > 80 ? '...' : ''}`);
      });
      
      return memories;
    }

    console.log(`[Memory] ℹ️ No memories found`);
    return [];
  } catch (error) {
    console.error("[Memory] ❌ Get relevant memories error:", error);
    return [];
  }
}

// Format memories for AI context
export function formatMemoriesForContext(memories: MemoryItem[]): string {
  if (memories.length === 0) return "";

  const memoryTexts = memories.map((m, i) => `${i + 1}. ${m.memory}`).join("\n");

  return `\n\n[User Memory Context]\nThe following are relevant memories about the user:\n${memoryTexts}\n[End of Memory Context]\n`;
}

// Extract memories from conversation (LLM-assisted + Mem0)
export async function extractMemoriesFromMessage(
  userId: string,
  message: string
): Promise<void> {
  console.log(`[Memory] 🤖 LLM-assisted memory extraction...`);
  
  // Skip very short messages
  if (message.length < 10) {
    console.log(`[Memory] ℹ️ Message too short, skipping extraction`);
    return;
  }

  try {
    // 1. Use LLM to extract semantic memories
    const memories = await extractMemoriesWithLLM(message);
    
    if (memories.length === 0) {
      console.log(`[Memory] ℹ️ No extractable information found`);
      
      // Still try Mem0 automatic extraction
      await addMemoryThroughConversation(userId, message);
      return;
    }

    // 2. Save each extracted memory
    for (const { memory, category } of memories) {
      // Save to local DB (backup + audit)
      await addMemory(userId, memory, category);
    }
    
    // 3. Let Mem0 also process the message for automatic extraction
    await addMemoryThroughConversation(userId, message);
    
    console.log(`[Memory] ✅ Extracted and saved ${memories.length} memories`);
  } catch (error) {
    console.error("[Memory] ❌ Extraction failed:", error);
  }
}
