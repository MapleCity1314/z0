import { tool } from "ai";
import { z } from "zod";
import {
  createArtifact,
  getArtifactByIndex,
  getArtifactsByChatId,
  updateArtifactCode,
  getNextArtifactIndex,
} from "@/lib/db/queries";

/**
 * Apply line-based diff to code
 * Replaces lines from startLine to endLine with newContent
 */
function applyLineDiff(
  originalCode: string,
  startLine: number,
  endLine: number,
  newContent: string
): string {
  const lines = originalCode.split("\n");
  const newLines = newContent.split("\n");
  
  // Convert to 0-indexed
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  
  // Replace lines
  lines.splice(start, end - start, ...newLines);
  
  return lines.join("\n");
}

/**
 * Extract lines from code
 */
function extractLines(code: string, startLine: number, endLine: number): string {
  const lines = code.split("\n");
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  return lines.slice(start, end).join("\n");
}

/**
 * Create Artifact Tool
 * Creates a new code artifact and stores it in the database
 */
export const createArtifactTool = tool({
  description: `Create a new executable code artifact. Use this when writing NEW code that doesn't exist yet.
  
The artifact will be stored with a unique index (e.g., A1, A2) that you can reference later.

Supported languages: Python, JavaScript, TypeScript, HTML, Java, Go, Rust, C, C++

Use this tool when:
- User asks you to write new code in any supported language
- Creating a new code example or demo
- Starting a new code file

Returns the artifact index for future reference.`,

  inputSchema: z.object({
    title: z.string().describe("A short descriptive title for the code"),
    language: z.enum([
      "python",
      "javascript",
      "typescript",
      "html",
      "java",
      "go",
      "rust",
      "c",
      "cpp",
    ]).describe("Programming language"),
    code: z.string().describe("The complete executable code"),
    description: z.string().optional().describe("Brief description of what the code does"),
  }),

  execute: async ({ title, language, code, description }, { toolCallId, messages }) => {
    // Extract chatId from the context (passed via messages metadata)
    const chatId = (messages as unknown as { chatId?: string })?.chatId;
    
    if (!chatId) {
      return {
        success: false,
        error: "Chat context not available",
        index: null,
        title,
        language,
        code,
        description,
      };
    }

    try {
      const index = await getNextArtifactIndex(chatId);
      const artifact = await createArtifact({
        chatId,
        index,
        title,
        language,
        code,
        description,
      });

      return {
        success: true,
        id: artifact.id,
        index: artifact.index,
        title,
        language,
        code,
        description,
        totalLines: code.split("\n").length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create artifact",
        index: null,
        title,
        language,
        code,
        description,
      };
    }
  },
});

/**
 * Read Artifact Tool
 * Reads code from an existing artifact, optionally specific lines
 */
export const readArtifactTool = tool({
  description: `Read code from an existing artifact by its index (e.g., A1, A2).
  
You can read the entire file or specific line ranges. Use this to:
- Review existing code before making changes
- Check specific sections of code
- Understand the current state of an artifact

Always read before updating to ensure you have the latest version.`,

  inputSchema: z.object({
    index: z.string().describe("Artifact index (e.g., 'A1', 'A2')"),
    startLine: z.number().optional().describe("Start line number (1-indexed, inclusive)"),
    endLine: z.number().optional().describe("End line number (1-indexed, inclusive)"),
  }),

  execute: async ({ index, startLine, endLine }, { messages }) => {
    const chatId = (messages as unknown as { chatId?: string })?.chatId;
    
    if (!chatId) {
      return {
        success: false,
        error: "Chat context not available",
        code: null,
      };
    }

    try {
      const artifact = await getArtifactByIndex(chatId, index);
      
      if (!artifact) {
        return {
          success: false,
          error: `Artifact ${index} not found`,
          code: null,
        };
      }

      const totalLines = artifact.code.split("\n").length;
      
      // If line range specified, extract those lines
      if (startLine !== undefined && endLine !== undefined) {
        const extractedCode = extractLines(artifact.code, startLine, endLine);
        return {
          success: true,
          index: artifact.index,
          title: artifact.title,
          language: artifact.language,
          code: extractedCode,
          lineRange: { start: startLine, end: endLine },
          totalLines,
        };
      }

      // Return full code
      return {
        success: true,
        index: artifact.index,
        title: artifact.title,
        language: artifact.language,
        code: artifact.code,
        totalLines,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read artifact",
        code: null,
      };
    }
  },
});

/**
 * Update Artifact Tool
 * Updates specific lines in an existing artifact using diff
 */
export const updateArtifactTool = tool({
  description: `Update specific lines in an existing artifact using line-based diff.
  
Specify the line range to replace and provide the new content. This is efficient for:
- Fixing bugs in specific functions
- Adding new code at specific locations
- Modifying a section without rewriting the entire file

IMPORTANT: 
- Line numbers are 1-indexed
- The specified lines (startLine to endLine) will be REPLACED with newContent
- To insert without deleting, use the same line for start and end
- Always read the artifact first to know the current line numbers`,

  inputSchema: z.object({
    index: z.string().describe("Artifact index (e.g., 'A1', 'A2')"),
    startLine: z.number().describe("Start line to replace (1-indexed, inclusive)"),
    endLine: z.number().describe("End line to replace (1-indexed, inclusive)"),
    newContent: z.string().describe("New code content to insert"),
  }),

  execute: async ({ index, startLine, endLine, newContent }, { messages }) => {
    const chatId = (messages as unknown as { chatId?: string })?.chatId;
    
    if (!chatId) {
      return {
        success: false,
        error: "Chat context not available",
      };
    }

    try {
      const artifact = await getArtifactByIndex(chatId, index);
      
      if (!artifact) {
        return {
          success: false,
          error: `Artifact ${index} not found`,
        };
      }

      // Apply diff
      const updatedCode = applyLineDiff(artifact.code, startLine, endLine, newContent);
      
      // Save to database
      const updated = await updateArtifactCode(artifact.id, updatedCode);
      
      if (!updated) {
        return {
          success: false,
          error: "Failed to update artifact",
        };
      }

      return {
        success: true,
        index: updated.index,
        title: updated.title,
        language: updated.language,
        code: updatedCode,
        linesModified: { start: startLine, end: endLine },
        totalLines: updatedCode.split("\n").length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update artifact",
      };
    }
  },
});

/**
 * List Artifacts Tool
 * Lists all artifacts in the current chat
 */
export const listArtifactsTool = tool({
  description: `List all code artifacts in the current conversation.
  
Use this to see what artifacts exist and their indices before reading or updating them.`,

  inputSchema: z.object({}),

  execute: async (_, { messages }) => {
    const chatId = (messages as unknown as { chatId?: string })?.chatId;
    
    if (!chatId) {
      return {
        success: false,
        error: "Chat context not available",
        artifacts: [],
      };
    }

    try {
      const artifacts = await getArtifactsByChatId(chatId);
      
      return {
        success: true,
        artifacts: artifacts.map((a) => ({
          index: a.index,
          title: a.title,
          language: a.language,
          totalLines: a.code.split("\n").length,
          updatedAt: a.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list artifacts",
        artifacts: [],
      };
    }
  },
});

// Legacy export for backward compatibility
export const codeArtifactTool = createArtifactTool;
