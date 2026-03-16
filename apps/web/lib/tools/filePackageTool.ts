/**
 * File Package Tool
 * Save files locally, create ZIP archives, and generate download links
 */
import { tool } from "ai";
import { z } from "zod";
import { writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { nanoid } from "nanoid";

// Storage directory for temporary files
const TEMP_DIR = join(process.cwd(), "public", "downloads");

// Get base URL from environment or use localhost
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

// Ensure temp directory exists
async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

// Clean up old files (older than 1 hour)
async function cleanupOldFiles() {
  try {
    const files = await readdir(TEMP_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const file of files) {
      const filePath = join(TEMP_DIR, file);
      const stats = await import("node:fs/promises").then(fs => fs.stat(filePath));
      if (now - stats.mtimeMs > oneHour) {
        await rm(filePath, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.error("[FilePackage] Cleanup error:", error);
  }
}

/**
 * Save File Tool
 * Save a single file to the temporary storage
 */
export const saveFileTool = tool({
  description: `Save a file to temporary storage. Use this when you need to create files that the user can download.
  
The file will be stored temporarily and can be included in a ZIP package later.

Supported use cases:
- Saving code files (any programming language)
- Creating configuration files
- Generating data files (JSON, CSV, etc.)
- Creating documentation (Markdown, text files)

Returns the file ID for later reference.`,

  inputSchema: z.object({
    filename: z.string().describe("File name with extension (e.g., 'app.py', 'config.json')"),
    content: z.string().describe("File content"),
    description: z.string().optional().describe("Brief description of the file"),
  }),

  execute: async ({ filename, content, description }) => {
    try {
      await ensureTempDir();
      await cleanupOldFiles();

      // Create unique directory for this file set
      const fileId = nanoid(10);
      const fileDir = join(TEMP_DIR, fileId);
      await mkdir(fileDir, { recursive: true });

      // Save file
      const filePath = join(fileDir, filename);
      await writeFile(filePath, content, "utf-8");

      console.log(`[FilePackage] ✅ Saved file: ${filename} (${content.length} bytes)`);

      return {
        success: true,
        fileId,
        filename,
        size: content.length,
        description,
        message: `File saved successfully: ${filename}`,
      };
    } catch (error) {
      console.error("[FilePackage] ❌ Save error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save file",
      };
    }
  },
});

/**
 * Save Multiple Files Tool
 * Save multiple files at once to the same package
 */
export const saveMultipleFilesTool = tool({
  description: `Save multiple files at once to create a file package. Use this when you need to create a project with multiple files.
  
This is more efficient than calling saveFile multiple times. All files will be stored together and can be packaged into a ZIP.

Supported use cases:
- Creating a complete project structure
- Generating multiple related files
- Setting up a starter template

Returns a package ID that can be used to create a ZIP.`,

  inputSchema: z.object({
    files: z.array(z.object({
      filename: z.string().describe("File name with extension"),
      content: z.string().describe("File content"),
      path: z.string().optional().describe("Subdirectory path (e.g., 'src/', 'config/')"),
    })).describe("Array of files to save"),
    description: z.string().optional().describe("Description of the file package"),
  }),

  execute: async ({ files, description }) => {
    try {
      await ensureTempDir();
      await cleanupOldFiles();

      // Create unique directory for this package
      const packageId = nanoid(10);
      const packageDir = join(TEMP_DIR, packageId);
      await mkdir(packageDir, { recursive: true });

      // Save all files
      const savedFiles = [];
      for (const file of files) {
        const subDir = file.path ? join(packageDir, file.path) : packageDir;
        if (!existsSync(subDir)) {
          await mkdir(subDir, { recursive: true });
        }

        const filePath = join(subDir, file.filename);
        await writeFile(filePath, file.content, "utf-8");
        
        savedFiles.push({
          filename: file.filename,
          path: file.path || "",
          size: file.content.length,
        });
      }

      console.log(`[FilePackage] ✅ Saved ${files.length} files to package ${packageId}`);

      return {
        success: true,
        packageId,
        filesCount: files.length,
        files: savedFiles,
        description,
        message: `Successfully saved ${files.length} files`,
      };
    } catch (error) {
      console.error("[FilePackage] ❌ Save multiple files error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save files",
      };
    }
  },
});

/**
 * Create ZIP Tool
 * Create a ZIP archive from saved files and generate download link
 */
export const createZipTool = tool({
  description: `Create a ZIP archive from previously saved files and generate a download link.
  
Use the packageId or fileId from saveFile/saveMultipleFiles to create the ZIP.

The ZIP will be available for download for 1 hour, after which it will be automatically deleted.

Returns a download URL that the user can click to download the ZIP file.`,

  inputSchema: z.object({
    packageId: z.string().describe("Package ID from saveFile or saveMultipleFiles"),
    zipName: z.string().optional().describe("Custom ZIP file name (without .zip extension)"),
  }),

  execute: async ({ packageId, zipName }) => {
    try {
      await ensureTempDir();

      const sourceDir = join(TEMP_DIR, packageId);
      
      // Check if source directory exists
      if (!existsSync(sourceDir)) {
        return {
          success: false,
          error: `Package ${packageId} not found. Files may have expired or the package ID is invalid.`,
        };
      }

      // Generate ZIP filename
      const zipFilename = `${zipName || packageId}.zip`;
      const zipPath = join(TEMP_DIR, zipFilename);

      // Create ZIP archive
      await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => {
          console.log(`[FilePackage] ✅ ZIP created: ${zipFilename} (${archive.pointer()} bytes)`);
          resolve();
        });

        archive.on("error", (err) => {
          console.error("[FilePackage] ❌ ZIP error:", err);
          reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
      });

      // Generate download URL
      const baseUrl = getBaseUrl();
      const downloadUrl = `${baseUrl}/downloads/${zipFilename}`;
      const fileSize = (await import("node:fs/promises").then(fs => fs.stat(zipPath))).size;
      const fileSizeKB = (fileSize / 1024).toFixed(2);

      return {
        success: true,
        zipFilename,
        downloadUrl,
        size: fileSize,
        message: `ZIP archive created successfully!\n\n📦 File: ${zipFilename}\n💾 Size: ${fileSizeKB} KB\n⏰ Expires in: 1 hour\n\n🔗 Download link:\n${downloadUrl}\n\nPlease copy and paste the link above into your browser to download the file.`,
        expiresIn: "1 hour",
      };
    } catch (error) {
      console.error("[FilePackage] ❌ Create ZIP error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create ZIP",
      };
    }
  },
});

/**
 * List Saved Packages Tool
 * List all available file packages
 */
export const listPackagesTool = tool({
  description: `List all available file packages in temporary storage.
  
Use this to see what packages are available before creating a ZIP.`,

  inputSchema: z.object({}),

  execute: async () => {
    try {
      await ensureTempDir();
      
      const items = await readdir(TEMP_DIR, { withFileTypes: true });
      const packages = [];

      for (const item of items) {
        if (item.isDirectory()) {
          const packagePath = join(TEMP_DIR, item.name);
          const files = await readdir(packagePath);
          packages.push({
            packageId: item.name,
            filesCount: files.length,
            files: files.slice(0, 10), // Show first 10 files
          });
        }
      }

      return {
        success: true,
        packages,
        message: `Found ${packages.length} package(s)`,
      };
    } catch (error) {
      console.error("[FilePackage] ❌ List packages error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list packages",
        packages: [],
      };
    }
  },
});
