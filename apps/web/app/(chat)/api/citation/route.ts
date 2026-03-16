import { streamObject } from "ai";
import { z } from "zod";
import { getModelFromServer } from "@/lib/agent/model";

export const citationSchema = z.object({
  content: z
    .string()
    .describe(
      "The main content with inline citations marked as [1], [2], etc.",
    ),
  citations: z
    .array(
      z.object({
        number: z.string().describe('Citation number (e.g., "1", "2")'),
        title: z.string().describe("Title of the source"),
        url: z.string().describe("URL of the source"),
        description: z
          .string()
          .optional()
          .describe("Brief description of the source"),
        quote: z.string().optional().describe("Relevant quote from the source"),
      }),
    )
    .describe("Array of citations referenced in the content"),
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "Missing or invalid prompt" },
        { status: 400 },
      );
    }

    const result = streamObject({
      model: getModelFromServer("z0-pro") as any,
      schema: citationSchema,
      prompt: `Generate a well-researched paragraph about "${prompt}" with proper citations. 
    
Include:
- A comprehensive paragraph with inline citations marked as [1], [2], etc.
- 2-3 citations with realistic source information
- Each citation should have a title, URL, and optional description/quote
- Make the content informative and the sources credible

Format citations as numbered references within the text.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[Citation API] Error:", error);
    return Response.json(
      { error: "Failed to generate citation" },
      { status: 500 },
    );
  }
}
