/**
 * Vercel Deployment Route
 * Exports the project and guides users to deploy on Vercel.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getProjectInfoAction } from "@/lib/project/db/project-actions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.redirect(new URL("/auth", request.url));
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
  
  if (!files["package.json"]) {
    return new NextResponse(
      JSON.stringify({ error: "Project must have a package.json file" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deploy to Vercel - ${project.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .project-name {
      color: #a1a1aa;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    .steps {
      text-align: left;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .step {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .step:last-child {
      margin-bottom: 0;
    }
    .step-number {
      width: 24px;
      height: 24px;
      background: #27272a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }
    .step-content h3 {
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .step-content p {
      font-size: 0.75rem;
      color: #71717a;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
      width: 100%;
    }
    .btn-vercel {
      background: #fff;
      color: #000;
    }
    .btn-vercel:hover {
      background: #e5e5e5;
    }
    .btn svg {
      width: 18px;
      height: 18px;
    }
    .note {
      font-size: 0.75rem;
      color: #52525b;
      margin-top: 1rem;
    }
    .back-link {
      display: inline-block;
      margin-top: 1.5rem;
      color: #71717a;
      font-size: 0.875rem;
      text-decoration: none;
    }
    .back-link:hover {
      color: #a1a1aa;
    }
    .loading {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
    }
    .loading.show {
      display: flex;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #27272a;
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <svg class="logo" viewBox="0 0 76 65" fill="white">
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
    </svg>
    <h1>Deploy to Vercel</h1>
    <p class="project-name">${project.name}</p>
    
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>Download Project</h3>
          <p>Export your project as a ZIP file</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Create GitHub Repository</h3>
          <p>Upload the project to a new GitHub repo</p>
        </div>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>Import to Vercel</h3>
          <p>Connect your repo and deploy automatically</p>
        </div>
      </div>
    </div>
    
    <div id="actions">
      <button class="btn btn-vercel" onclick="handleDeploy()">
        <svg viewBox="0 0 76 65" fill="currentColor">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
        </svg>
        Download & Deploy
      </button>
    </div>
    
    <div id="loading" class="loading">
      <div class="spinner"></div>
      <span>Preparing download...</span>
    </div>
    
    <p class="note">
      You'll need a Vercel account to deploy. 
      <a href="https://vercel.com/signup" target="_blank" style="color: #a1a1aa;">Sign up free</a>
    </p>
    
    <a href="/" class="back-link">Back to Z0</a>
  </div>

  <script>
    const projectId = '${projectId}';
    
    async function handleDeploy() {
      const actionsEl = document.getElementById('actions');
      const loadingEl = document.getElementById('loading');
      
      actionsEl.style.display = 'none';
      loadingEl.classList.add('show');
      
      try {
        const response = await fetch('/api/projects/' + projectId + '/export');
        
        if (!response.ok) {
          throw new Error('Failed to export project');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setTimeout(() => {
          window.open('https://vercel.com/new', '_blank');
        }, 1000);
        
      } catch (error) {
        alert('Failed to export project: ' + error.message);
      } finally {
        actionsEl.style.display = 'block';
        loadingEl.classList.remove('show');
      }
    }
  </script>
</body>
</html>
  `.trim();

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
