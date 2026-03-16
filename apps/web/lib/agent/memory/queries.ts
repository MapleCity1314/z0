/**
 * Memory Database Queries
 * CRUD operations for user memories
 */
import { db } from "@/lib/db";
import { memory, type Memory } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

// Generate hash for deduplication
function generateMemoryHash(userId: string, memoryText: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${memoryText.toLowerCase().trim()}`)
    .digest("hex");
}

// Add memory
export async function addMemory({
  userId,
  memoryText,
  category,
  metadata,
}: {
  userId: string;
  memoryText: string;
  category?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; message: string; data?: Memory }> {
  try {
    const hash = generateMemoryHash(userId, memoryText);
    
    // Check for duplicates
    const existing = await db
      .select()
      .from(memory)
      .where(and(eq(memory.userId, userId), eq(memory.hash, hash)))
      .limit(1);

    if (existing.length > 0) {
      // Update last accessed time
      const updated = await db
        .update(memory)
        .set({ 
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(memory.id, existing[0].id))
        .returning();

      return {
        success: true,
        message: "Memory already exists, updated access time",
        data: updated[0],
      };
    }

    // Insert new memory
    const result = await db
      .insert(memory)
      .values({
        userId,
        memory: memoryText,
        category,
        metadata,
        hash,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
      })
      .returning();

    return {
      success: true,
      message: "Memory added successfully",
      data: result[0],
    };
  } catch (error) {
    console.error("[Memory] Add error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add memory",
    };
  }
}

// Get user memories
export async function getUserMemories({
  userId,
  category,
  limit = 50,
}: {
  userId: string;
  category?: string;
  limit?: number;
}): Promise<{ success: boolean; message: string; data?: Memory[] }> {
  try {
    const conditions = category
      ? and(eq(memory.userId, userId), eq(memory.category, category))
      : eq(memory.userId, userId);

    const memories = await db
      .select()
      .from(memory)
      .where(conditions)
      .orderBy(desc(memory.lastAccessedAt))
      .limit(limit);

    return {
      success: true,
      message: "Memories retrieved successfully",
      data: memories,
    };
  } catch (error) {
    console.error("[Memory] Get error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to get memories",
    };
  }
}

// Search memories
export async function searchMemories({
  userId,
  query,
  limit = 10,
}: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<{ success: boolean; message: string; data?: Memory[] }> {
  try {
    // Simple text search (can be enhanced with full-text search)
    const memories = await db
      .select()
      .from(memory)
      .where(eq(memory.userId, userId))
      .orderBy(desc(memory.lastAccessedAt))
      .limit(limit * 3); // Get more to filter

    // Filter by query
    const filtered = memories
      .filter((m) =>
        m.memory.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);

    // Update last accessed time for found memories
    if (filtered.length > 0) {
      await Promise.all(
        filtered.map((m) =>
          db
            .update(memory)
            .set({ lastAccessedAt: new Date() })
            .where(eq(memory.id, m.id))
        )
      );
    }

    return {
      success: true,
      message: "Memories searched successfully",
      data: filtered,
    };
  } catch (error) {
    console.error("[Memory] Search error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to search memories",
    };
  }
}

// Delete memory
export async function deleteMemory({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    await db
      .delete(memory)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)));

    return {
      success: true,
      message: "Memory deleted successfully",
    };
  } catch (error) {
    console.error("[Memory] Delete error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete memory",
    };
  }
}

// Update memory
export async function updateMemory({
  id,
  userId,
  memoryText,
  category,
  metadata,
}: {
  id: string;
  userId: string;
  memoryText?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; message: string; data?: Memory }> {
  try {
    const updates: Partial<Memory> = {
      updatedAt: new Date(),
    };

    if (memoryText) {
      updates.memory = memoryText;
      updates.hash = generateMemoryHash(userId, memoryText);
    }
    if (category !== undefined) updates.category = category;
    if (metadata !== undefined) updates.metadata = metadata;

    const result = await db
      .update(memory)
      .set(updates)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        message: "Memory not found",
      };
    }

    return {
      success: true,
      message: "Memory updated successfully",
      data: result[0],
    };
  } catch (error) {
    console.error("[Memory] Update error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update memory",
    };
  }
}
