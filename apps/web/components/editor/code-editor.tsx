"use client";

import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const Z0_DARK_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "keyword", foreground: "c084fc" },
    { token: "string", foreground: "86efac" },
    { token: "number", foreground: "fbbf24" },
    { token: "type", foreground: "60a5fa" },
    { token: "function", foreground: "f472b6" },
    { token: "variable", foreground: "e4e4e7" },
    { token: "constant", foreground: "fb923c" },
  ],
  colors: {
    "editor.background": "#09090b",           // zinc-950
    "editor.foreground": "#e4e4e7",           // zinc-200
    "editor.lineHighlightBackground": "#18181b", // zinc-900
    "editor.selectionBackground": "#3f3f46",  // zinc-700
    "editor.inactiveSelectionBackground": "#27272a", // zinc-800
    "editorLineNumber.foreground": "#52525b", // zinc-600
    "editorLineNumber.activeForeground": "#a1a1aa", // zinc-400
    "editorCursor.foreground": "#ffffff",
    "editor.selectionHighlightBackground": "#3f3f4650",
    "editorIndentGuide.background": "#27272a",
    "editorIndentGuide.activeBackground": "#3f3f46",
    "editorWidget.background": "#18181b",
    "editorWidget.border": "#27272a",
    "editorSuggestWidget.background": "#18181b",
    "editorSuggestWidget.border": "#27272a",
    "editorSuggestWidget.selectedBackground": "#27272a",
    "scrollbarSlider.background": "#27272a80",
    "scrollbarSlider.hoverBackground": "#3f3f46",
    "scrollbarSlider.activeBackground": "#52525b",
  },
};

const Z0_LIGHT_THEME: editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "71717a", fontStyle: "italic" }, // zinc-500
    { token: "keyword", foreground: "7c3aed" }, // violet-600
    { token: "string", foreground: "16a34a" }, // green-600
    { token: "number", foreground: "d97706" }, // amber-600
    { token: "type", foreground: "2563eb" }, // blue-600
    { token: "function", foreground: "db2777" }, // pink-600
    { token: "variable", foreground: "18181b" }, // zinc-900
    { token: "constant", foreground: "ea580c" }, // orange-600
  ],
  colors: {
    "editor.background": "#ffffff",           // white
    "editor.foreground": "#18181b",           // zinc-900
    "editor.lineHighlightBackground": "#f4f4f5", // zinc-100
    "editor.selectionBackground": "#e4e4e7",  // zinc-200
    "editor.inactiveSelectionBackground": "#f4f4f5", // zinc-100
    "editorLineNumber.foreground": "#a1a1aa", // zinc-400
    "editorLineNumber.activeForeground": "#52525b", // zinc-600
    "editorCursor.foreground": "#000000",
    "editor.selectionHighlightBackground": "#e4e4e780",
    "editorIndentGuide.background": "#e4e4e7",
    "editorIndentGuide.activeBackground": "#d4d4d8",
    "editorWidget.background": "#ffffff",
    "editorWidget.border": "#e4e4e7",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.border": "#e4e4e7",
    "editorSuggestWidget.selectedBackground": "#f4f4f5",
    "scrollbarSlider.background": "#e4e4e780",
    "scrollbarSlider.hoverBackground": "#d4d4d8",
    "scrollbarSlider.activeBackground": "#a1a1aa",
  },
};

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  height?: string | number;
  minimap?: boolean;
  lineNumbers?: boolean;
  wordWrap?: "on" | "off" | "wordWrapColumn" | "bounded";
  fontSize?: number;
}

export function CodeEditor({
  value,
  onChange,
  language = "typescript",
  readOnly = false,
  className,
  height = "100%",
  minimap = false,
  lineNumbers = true,
  wordWrap = "on",
  fontSize = 14,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { resolvedTheme } = useTheme();

  // 监听主题变化并更新 Monaco 主题
  useEffect(() => {
    if (monacoRef.current) {
      const theme = resolvedTheme === "dark" ? "z0-dark" : "z0-light";
      monacoRef.current.editor.setTheme(theme);
    }
  }, [resolvedTheme]);

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 注册自定义主题 (同时注册暗色和亮色)
    monaco.editor.defineTheme("z0-dark", Z0_DARK_THEME);
    monaco.editor.defineTheme("z0-light", Z0_LIGHT_THEME);

    // 设置当前主题
    const theme = resolvedTheme === "dark" ? "z0-dark" : "z0-light";
    monaco.editor.setTheme(theme);

    // 禁用所有诊断/检查
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });

    // 设置编辑器选项
    editor.updateOptions({
      fontFamily: "'Fira Code', monospace",
      fontLigatures: true,
      fontSize,
      lineHeight: 1.6,
      padding: { top: 16, bottom: 16 },
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      renderLineHighlight: "line",
      renderWhitespace: "selection",
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });
  }, [fontSize, resolvedTheme]);

  const handleChange = useCallback((value: string | undefined) => {
    onChange?.(value || "");
  }, [onChange]);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border",
      "border-zinc-200 bg-white", // Light
      "dark:border-zinc-800 dark:bg-zinc-950", // Dark
      className
    )}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={resolvedTheme === "dark" ? "z0-dark" : "z0-light"}
        loading={
          <div className="flex h-full items-center justify-center bg-white dark:bg-zinc-950 text-zinc-500">
            Loading editor...
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: minimap },
          lineNumbers: lineNumbers ? "on" : "off",
          wordWrap,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          folding: true,
          foldingHighlight: true,
          showFoldingControls: "mouseover",
          contextmenu: true,
          quickSuggestions: !readOnly,
          suggestOnTriggerCharacters: !readOnly,
          acceptSuggestionOnEnter: "on",
          snippetSuggestions: readOnly ? "none" : "inline",
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}

// 语言映射 (保持不变)
export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    dockerfile: "dockerfile",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || "plaintext";
}
