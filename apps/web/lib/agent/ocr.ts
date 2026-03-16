/**
 * OCR Tool - Extract text from images using vision models
 */
import { generateText } from "ai";
import { model } from "@/lib/agent/model";

export interface OCRResult {
  text: string;
  confidence?: number;
  error?: string;
}

/**
 * Extract text from image using vision model
 * @param imageUrl - Image URL (data URL or http URL)
 * @param filename - Optional filename for context
 * @returns Extracted text content
 */
export async function extractTextFromImage(
  imageUrl: string,
  filename?: string
): Promise<OCRResult> {
  try {
    console.log(`[OCR] Processing image: ${filename || 'unnamed'}`);

    const { text } = await generateText({
      model: model.vision.kimiVision,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text from this image. Output ONLY the extracted text, nothing else.

Rules:
- Extract ALL visible text exactly as shown
- Preserve line breaks, spacing, and formatting
- Maintain reading order (top to bottom, left to right)
- Keep code indentation if present
- Include all labels, captions, and annotations
- If no text exists, output: [No text detected]
- DO NOT add explanations or descriptions
- DO NOT say "The image shows..." or similar phrases

${filename ? `Image filename: ${filename}` : ''}`,
            },
            {
              type: "image",
              image: imageUrl,
            },
          ],
        },
      ],
      temperature: 0.1, // Low temperature for accuracy
    });

    console.log(`[OCR] Extracted ${text.length} characters`);

    return {
      text: text.trim(),
      confidence: 0.95, // Placeholder, actual confidence depends on model
    };
  } catch (error) {
    console.error("[OCR] Error:", error);
    return {
      text: "",
      error: error instanceof Error ? error.message : "OCR failed",
    };
  }
}

/**
 * Process multiple images in parallel
 */
export async function extractTextFromImages(
  images: Array<{ url: string; filename?: string }>
): Promise<OCRResult[]> {
  return Promise.all(
    images.map((img) => extractTextFromImage(img.url, img.filename))
  );
}
