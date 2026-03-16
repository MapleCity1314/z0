/**
 * HTML executor - creates a blob URL for HTML preview
 */

export interface HtmlExecuteResult {
  success: boolean;
  previewUrl: string;
  error?: string;
}

/**
 * Create a blob URL for HTML content preview
 */
export function createHtmlPreview(htmlCode: string): HtmlExecuteResult {
  try {
    // Wrap HTML in a complete document if needed
    let fullHtml = htmlCode;
    
    if (!htmlCode.toLowerCase().includes("<!doctype") && !htmlCode.toLowerCase().includes("<html")) {
      fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
${htmlCode}
</body>
</html>`;
    }

    // Create blob URL
    const blob = new Blob([fullHtml], { type: "text/html" });
    const previewUrl = URL.createObjectURL(blob);

    return {
      success: true,
      previewUrl,
    };
  } catch (err) {
    return {
      success: false,
      previewUrl: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeHtmlPreview(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
