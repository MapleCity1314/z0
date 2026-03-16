/**
 * Project Export Route
 * Exports the project as a ZIP archive.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getProjectInfoAction } from "@/lib/project/db/project-actions";
import JSZip from "jszip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  const user = await getCurrentUser();
  if (!user?.id) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const result = await getProjectInfoAction(projectId);
  
  if (!result.success || !result.data) {
    return new NextResponse(
      JSON.stringify({ error: "Project not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const project = result.data;
  const files = (project.files as Record<string, string>) || {};
  
  const zip = new JSZip();
  
  for (const [filePath, content] of Object.entries(files)) {
    zip.file(filePath, content);
  }
  
  if (!files["README.md"]) {
    const readme = `# ${project.name}

${project.description || "A project created with Z0."}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deploy

This project can be deployed to Vercel, Netlify, or any other hosting platform.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
`;
    zip.file("README.md", readme);
  }
  
  const zipBlob = await zip.generateAsync({ 
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 }
  });
  
  const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  
  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
