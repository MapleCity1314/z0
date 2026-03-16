import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const searchParams = request.nextUrl.searchParams;
  const previewUrl = searchParams.get("url") || "";
  const projectId = searchParams.get("projectId") || "";

  // 这里有三个 Logo 选项，你可以取消注释你喜欢的一个来替换 svg 内容

  // 选项 1: Slashed Zero (现代开发者风格)
  // const logoSvg = `
  //   <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  //     <path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 12H5V16L12.1 24H5V28H17.5V24L10.4 16H17.5V12H12.5Z" fill="currentColor"/>
  //     <path fill-rule="evenodd" clip-rule="evenodd" d="M23 12C20.7909 12 19 13.7909 19 16V24C19 26.2091 20.7909 28 23 28H31C33.2091 28 35 26.2091 35 24V16C35 13.7909 33.2091 12 31 12H23ZM31 16H23V24H31V16Z" fill="currentColor"/>
  //     <path d="M29.5 15L24.5 25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  //   </svg>
  // `;

  // 选项 1: Slashed Zero (现代开发者风格) - 已修正 Z 的方向
  const logoSvg = `
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 修正后的 Z 路径 -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="M10 12H17.5V16L10.4 24H17.5V28H5V24L12.1 16H5V12H10Z" fill="currentColor"/>
    <!-- 0 的路径保持不变 -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="M23 12C20.7909 12 19 13.7909 19 16V24C19 26.2091 20.7909 28 23 28H31C33.2091 28 35 26.2091 35 24V16C35 13.7909 33.2091 12 31 12H23ZM31 16H23V24H31V16Z" fill="currentColor"/>
    <!-- 0 中间的斜杠保持不变 -->
    <path d="M29.5 15L24.5 25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

  // 选项 2: Tech Block (科技方块风格) - 如果喜欢这个，替换上面的 logoSvg 变量

  // const logoSvg = `
  //   <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  //     <rect x="2" y="2" width="28" height="28" rx="6" fill="currentColor" fill-opacity="0.1"/>
  //     <path d="M10 10H18L10 22H18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  //     <circle cx="23" cy="23" r="2" fill="#10b981"/>
  //   </svg>
  // `;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - Z0</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --border: #27272a;
      --surface: #18181b;
      --text-main: #e4e4e7;
      --text-muted: #a1a1aa;
      --accent: #ffffff;
      --accent-fg: #000000;
      --glass-bg: rgba(9, 9, 11, 0.7);
      --glass-border: rgba(255, 255, 255, 0.08);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* --- Toolbar --- */
    .toolbar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--glass-border);
    }

    .toolbar-left, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Logo Styles - Updated */
    .logo-link {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: var(--text-main);
      transition: opacity 0.2s;
    }
    
    .logo-link:hover {
      opacity: 0.8;
    }

    .logo-svg {
      color: var(--text-main);
    }

    .logo-text {
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: -0.025em;
      font-family: 'JetBrains Mono', monospace; /* 使用等宽字体配合 */
    }

    /* --- Address Bar --- */
    .url-bar-container {
      flex: 1;
      display: flex;
      justify-content: center;
      max-width: 600px;
      margin: 0 1rem;
    }

    .url-bar {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .url-bar:hover {
      background: rgba(0, 0, 0, 0.4);
      border-color: #3f3f46;
      color: var(--text-main);
    }

    .url-bar svg.lock-icon {
      width: 12px;
      height: 12px;
      color: #10b981; 
    }
    
    .url-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    /* --- Buttons --- */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 36px;
      padding: 0 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-icon {
      padding: 0;
      width: 36px;
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
    }

    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
    }

    .btn-primary {
      background: var(--accent);
      color: var(--accent-fg);
      font-weight: 600;
    }

    .btn-primary:hover {
      background: #e4e4e7;
    }

    .btn svg {
      width: 16px;
      height: 16px;
    }

    /* --- Iframe Area --- */
    .preview-wrapper {
      flex: 1;
      position: relative;
      background: #ffffff;
      margin-top: 60px;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    iframe.loaded {
      opacity: 1;
    }

    /* --- States --- */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      color: var(--text-muted);
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border);
      border-top-color: var(--text-main);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 0.5rem 1rem;
      border-radius: 99px;
      font-size: 0.875rem;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .no-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: var(--bg);
      color: var(--text-muted);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 640px) {
      .hide-mobile { display: none; }
      .url-bar-container { margin: 0 0.5rem; }
      .url-text { max-width: 120px; }
      .toolbar { padding: 0 1rem; }
    }
  </style>
</head>
<body>
  <!-- Toast -->
  <div id="toast" class="toast">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span>URL Copied</span>
  </div>

  <div class="toolbar">
    <div class="toolbar-left">
      <!-- 替换后的 Logo 区域 -->
      <a href="/" class="logo-link" title="Back to Home">
        <div class="logo-svg">
          ${logoSvg}
        </div>
        <!-- 如果你想保留文字，可以保留下面这行，如果只要图标，可以删除 -->
        <!-- <span class="logo-text">Z0</span> -->
      </a>
    </div>
    
    <div class="url-bar-container">
      <div class="url-bar" onclick="copyUrl()" title="Click to copy URL">
        <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span class="url-text">${previewUrl || "Waiting for server..."}</span>
      </div>
    </div>

    <div class="toolbar-right">
      <button class="btn btn-ghost btn-icon" onclick="handleRefresh()" title="Refresh">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
      </button>
      
      <button class="btn btn-primary hide-mobile" onclick="handleDeployToVercel()">
        <svg viewBox="0 0 76 65" fill="currentColor">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/>
        </svg>
        <span>Deploy</span>
      </button>

      <div style="width: 1px; height: 24px; background: var(--border);"></div>

      <button class="btn btn-ghost btn-icon" onclick="window.close()" title="Close Preview">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  </div>
  
  <div class="preview-wrapper">
    ${
      previewUrl
        ? `
      <div id="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p style="font-size: 0.875rem;">Loading preview...</p>
      </div>
      <iframe 
        id="preview-iframe"
        src="${previewUrl}" 
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        title="Preview"
        onload="onIframeLoad()"
      ></iframe>
    `
        : `
      <div class="no-preview">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1rem; opacity: 0.5;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        <h2 style="color: var(--text-main); margin-bottom: 0.5rem; font-weight: 500;">No Preview Available</h2>
        <p>Start the dev server to see the preview</p>
      </div>
    `
    }
  </div>

  <script>
    const projectId = '${projectId}';
    const previewUrl = '${previewUrl}';
    
    function onIframeLoad() {
      const loader = document.getElementById('loading');
      const iframe = document.getElementById('preview-iframe');
      if (loader) loader.style.display = 'none';
      if (iframe) iframe.classList.add('loaded');
    }

    function handleRefresh() {
      const iframe = document.getElementById('preview-iframe');
      const loader = document.getElementById('loading');
      if (iframe && previewUrl) {
        if (loader) loader.style.display = 'flex';
        iframe.classList.remove('loaded');
        iframe.src = iframe.src;
      }
    }

    function copyUrl() {
      if (!previewUrl) return;
      navigator.clipboard.writeText(previewUrl).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      });
    }
    
    function handleDeployToVercel() {
      if (!projectId) {
        alert('No project ID found.');
        return;
      }
      if (confirm('Deploy this project to Vercel?')) {
        window.open('/api/projects/' + projectId + '/deploy/vercel', '_blank');
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
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  });
}
