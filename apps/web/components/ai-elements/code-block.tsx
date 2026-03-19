"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon, MaximizeIcon, PlayIcon } from "lucide-react";
import { useExecutorStore } from "@/store/executor";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from "shiki";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
};

type CodeBlockContextType = {
  code: string;
  language: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
  language: "typescript",
});

const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  plaintext: "text" as BundledLanguage,
  text: "text" as BundledLanguage,
};

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

const transparentBackgroundTransformer: ShikiTransformer = {
  name: "transparent-background",
  pre(node) {
    const style = String(node.properties.style ?? "");
    const nextStyle = style
      .replace(/background-color:[^;]+;?/g, "")
      .replace(/background:[^;]+;?/g, "")
      .trim();

    node.properties.style = nextStyle;
  },
};

export async function highlightCode(
  code: string,
  language: string,
  showLineNumbers = false
) {
  const normalizedLanguage = normalizeCodeLanguage(language);
  const transformers: ShikiTransformer[] = showLineNumbers
    ? [transparentBackgroundTransformer, lineNumberTransformer]
    : [transparentBackgroundTransformer];

  return await Promise.all([
    codeToHtml(code, {
      lang: normalizedLanguage,
      theme: "one-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: normalizedLanguage,
      theme: "one-dark-pro",
      transformers,
    }),
  ]);
}

export function normalizeCodeLanguage(language: string): BundledLanguage {
  const normalized = language.trim().toLowerCase();

  if (!normalized) {
    return "text" as BundledLanguage;
  }

  return (
    LANGUAGE_ALIASES[normalized] ?? (normalized as BundledLanguage)
  );
}

export function isInlineCodeNode(node?: {
  position?: {
    start?: { line?: number };
    end?: { line?: number };
  };
}) {
  const startLine = node?.position?.start?.line;
  const endLine = node?.position?.end?.line;

  return startLine !== undefined && startLine === endLine;
}

export function extractCodeText(children: ReactNode): string {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child) => extractCodeText(child)).join("");
  }

  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    children.props &&
    typeof children.props === "object" &&
    "children" in children.props
  ) {
    return extractCodeText(children.props.children as ReactNode);
  }

  return "";
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>("");
  const [darkHtml, setDarkHtml] = useState<string>("");
  const mounted = useRef(false);

  useEffect(() => {
    highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (!mounted.current) {
        setHtml(light);
        setDarkHtml(dark);
        mounted.current = true;
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers]);

  return (
    <CodeBlockContext.Provider value={{ code, language }}>
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
          className
        )}
        {...props}
      >
        <div className="relative">
          <div
            className="overflow-hidden dark:hidden [&>pre]:m-0 [&>pre]:overflow-x-auto [&>pre]:bg-muted! [&>pre]:p-4 [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="hidden overflow-hidden dark:block [&>pre]:m-0 [&>pre]:overflow-x-auto [&>pre]:bg-zinc-900! [&>pre]:p-4 [&>pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};

export type CodeBlockExecuteButtonProps = ComponentProps<typeof Button> & {
  onExecute?: () => void;
};

const EXECUTABLE_LANGUAGES = ["python", "html", "javascript", "typescript", "js", "ts"];

export const CodeBlockExecuteButton = ({
  onExecute,
  children,
  className,
  ...props
}: CodeBlockExecuteButtonProps) => {
  const { code, language } = useContext(CodeBlockContext);
  const { openPanel } = useExecutorStore();

  const isExecutable = EXECUTABLE_LANGUAGES.includes(language.toLowerCase());

  if (!isExecutable) {
    return null;
  }

  const handleExecute = () => {
    console.log("已触发 code executor");
    openPanel(code, normalizeCodeLanguage(language));
    onExecute?.();
  };

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={handleExecute}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <PlayIcon size={14} />}
    </Button>
  );
};

export type CodeBlockExpandButtonProps = ComponentProps<typeof Button>;

export const CodeBlockExpandButton = ({
  children,
  className,
  ...props
}: CodeBlockExpandButtonProps) => {
  const { code, language } = useContext(CodeBlockContext);
  const { openPanel } = useExecutorStore();

  const isExecutable = EXECUTABLE_LANGUAGES.includes(language.toLowerCase());

  if (!isExecutable) {
    return null;
  }

  const handleExpand = () => {
    openPanel(code, normalizeCodeLanguage(language));
  };

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={handleExpand}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <MaximizeIcon size={14} />}
    </Button>
  );
};
