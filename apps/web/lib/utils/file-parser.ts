/**
 * File Parser Utilities
 * 
 * Optional enhanced parsers for additional file formats.
 * Install dependencies as needed:
 * - PDF: pnpm add pdf-parse
 * - Word: pnpm add mammoth
 * - Excel: pnpm add xlsx
 */

/**
 * Parse PDF file to text
 * Requires: pnpm add pdf-parse
 */
export async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamically import to avoid errors if not installed
    const pdfParse = await import('pdf-parse');
    // @ts-ignore - pdf-parse has inconsistent type definitions
    const pdf = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    throw new Error('PDF parsing failed. Install pdf-parse: pnpm add pdf-parse');
  }
}

/**
 * Parse Word document (.docx) to text
 * Requires: pnpm add mammoth
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error('DOCX parsing failed. Install mammoth: pnpm add mammoth');
  }
}

/**
 * Parse Excel file (.xlsx) to text
 * Requires: pnpm add xlsx
 */
export async function parseXlsx(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const sheets = workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      return `=== Sheet: ${name} ===\n${csv}`;
    });
    
    return sheets.join('\n\n');
  } catch (error) {
    throw new Error('XLSX parsing failed. Install xlsx: pnpm add xlsx');
  }
}

/**
 * Parse CSV to formatted text
 */
export function parseCsv(content: string): string {
  const lines = content.split('\n');
  const headers = lines[0]?.split(',') || [];
  
  if (lines.length <= 1) return content;
  
  // Format as table
  let formatted = `Headers: ${headers.join(' | ')}\n`;
  formatted += '-'.repeat(50) + '\n';
  
  for (let i = 1; i < Math.min(lines.length, 100); i++) {
    formatted += lines[i] + '\n';
  }
  
  if (lines.length > 100) {
    formatted += `\n... (${lines.length - 100} more rows)`;
  }
  
  return formatted;
}

/**
 * Parse JSON to formatted text
 */
export function parseJson(content: string): string {
  try {
    const obj = JSON.parse(content);
    return JSON.stringify(obj, null, 2);
  } catch {
    return content; // Return as-is if invalid JSON
  }
}

/**
 * Parse XML to formatted text
 */
export function parseXml(content: string): string {
  // Basic XML formatting (could use xml2js for better parsing)
  return content
    .replace(/></g, '>\n<')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Detect file encoding and convert to UTF-8
 */
export function detectAndConvert(buffer: Buffer): string {
  // Try UTF-8 first
  try {
    const text = buffer.toString('utf-8');
    // Check for invalid UTF-8 sequences
    if (text.includes('\uFFFD')) {
      throw new Error('Invalid UTF-8');
    }
    return text;
  } catch {
    // Fallback to latin1
    return buffer.toString('latin1');
  }
}

/**
 * Extract metadata from file
 */
export function extractMetadata(filename: string, mimeType: string, size?: number) {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  return {
    filename,
    extension,
    mimeType,
    size,
    category: categorizeFile(extension, mimeType),
    isText: isTextFile(extension, mimeType),
    isImage: isImageFile(extension, mimeType),
    isCode: isCodeFile(extension),
  };
}

function categorizeFile(extension: string, mimeType: string): string {
  if (isImageFile(extension, mimeType)) return 'image';
  if (isCodeFile(extension)) return 'code';
  if (['pdf'].includes(extension)) return 'document';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
  if (isTextFile(extension, mimeType)) return 'text';
  return 'unknown';
}

function isTextFile(extension: string, mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    ['txt', 'md', 'json', 'xml', 'csv', 'log', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'].includes(extension)
  );
}

function isImageFile(extension: string, mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(extension)
  );
}

function isCodeFile(extension: string): boolean {
  return [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'sh', 'bash',
    'sql', 'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
    'r', 'lua', 'perl', 'dart', 'elm', 'ex', 'exs', 'clj', 'cljs'
  ].includes(extension);
}
