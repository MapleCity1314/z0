import type { ComponentProps, ReactNode } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PROVIDER_LOGO_ALIASES: Record<string, string> = {
  moonshotai: "moonshotai-cn",
};

const PROVIDER_BADGE_STYLE: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  openai: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/80 dark:border-emerald-800/80",
  },
  anthropic: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/80 dark:border-amber-800/80",
  },
  google: {
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200/80 dark:border-blue-800/80",
  },
  z0: {
    bg: "bg-zinc-100 dark:bg-zinc-800/80",
    text: "text-zinc-700 dark:text-zinc-200",
    border: "border-zinc-300/80 dark:border-zinc-700/80",
  },
  deepseek: {
    bg: "bg-cyan-50 dark:bg-cyan-900/30",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200/80 dark:border-cyan-800/80",
  },
  groq: {
    bg: "bg-violet-50 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200/80 dark:border-violet-800/80",
  },
};

const getProviderInitials = (provider: string) => {
  const clean = provider.replace(/[^a-zA-Z0-9]/g, "");
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  if (clean.length === 1) return `${clean.toUpperCase()}0`;
  return "AI";
};

export type ModelSelectorProps = ComponentProps<typeof Dialog>;

export const ModelSelector = (props: ModelSelectorProps) => (
  <Dialog {...props} />
);

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent className={cn("p-0", className)} {...props}>
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="**:data-[slot=command-input-wrapper]:h-auto">
      {children}
    </Command>
  </DialogContent>
);

export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>;

export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => (
  <CommandDialog {...props} />
);

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>;

export const ModelSelectorInput = ({
  className,
  ...props
}: ModelSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

export type ModelSelectorListProps = ComponentProps<typeof CommandList>;

export const ModelSelectorList = (props: ModelSelectorListProps) => (
  <CommandList {...props} />
);

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty {...props} />
);

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
  <CommandGroup {...props} />
);

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>;

export const ModelSelectorItem = (props: ModelSelectorItemProps) => (
  <CommandItem {...props} />
);

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
  <CommandShortcut {...props} />
);

export type ModelSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
);

export type ModelSelectorLogoProps = Omit<
  ComponentProps<"span">,
  "children"
> & {
  provider:
    | "moonshotai-cn"
    | "lucidquery"
    | "moonshotai"
    | "zai-coding-plan"
    | "alibaba"
    | "xai"
    | "vultr"
    | "nvidia"
    | "upstage"
    | "groq"
    | "github-copilot"
    | "mistral"
    | "vercel"
    | "nebius"
    | "deepseek"
    | "alibaba-cn"
    | "google-vertex-anthropic"
    | "venice"
    | "chutes"
    | "cortecs"
    | "github-models"
    | "togetherai"
    | "azure"
    | "baseten"
    | "huggingface"
    | "opencode"
    | "fastrouter"
    | "google"
    | "google-vertex"
    | "cloudflare-workers-ai"
    | "inception"
    | "wandb"
    | "openai"
    | "zhipuai-coding-plan"
    | "perplexity"
    | "openrouter"
    | "zenmux"
    | "v0"
    | "iflowcn"
    | "synthetic"
    | "deepinfra"
    | "zhipuai"
    | "submodel"
    | "zai"
    | "inference"
    | "requesty"
    | "morph"
    | "lmstudio"
    | "anthropic"
    | "aihubmix"
    | "fireworks-ai"
    | "modelscope"
    | "llama"
    | "scaleway"
    | "amazon-bedrock"
    | "cerebras"
    | (string & {});
};

export const ModelSelectorLogo = ({
  provider,
  className,
  ...props
}: ModelSelectorLogoProps) => {
  const logoProvider = PROVIDER_LOGO_ALIASES[provider] ?? provider;
  const initials = getProviderInitials(logoProvider);
  const style = PROVIDER_BADGE_STYLE[logoProvider] ?? {
    bg: "bg-zinc-100 dark:bg-zinc-800/80",
    text: "text-zinc-700 dark:text-zinc-200",
    border: "border-zinc-300/80 dark:border-zinc-700/80",
  };

  return (
    <span
      {...props}
      role="img"
      aria-label={`${provider} logo`}
      className={cn(
        "inline-flex size-3 items-center justify-center rounded-[4px] border text-[8px] font-semibold leading-none tracking-tight",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      {initials}
    </span>
  );
};

export type ModelSelectorLogoGroupProps = ComponentProps<"div">;

export const ModelSelectorLogoGroup = ({
  className,
  ...props
}: ModelSelectorLogoGroupProps) => (
  <div
    className={cn(
      "-space-x-1 flex shrink-0 items-center [&>*]:rounded-full [&>*]:bg-background [&>*]:p-px [&>*]:ring-1 dark:[&>*]:bg-foreground",
      className,
    )}
    {...props}
  />
);

export type ModelSelectorNameProps = ComponentProps<"span">;

export const ModelSelectorName = ({
  className,
  ...props
}: ModelSelectorNameProps) => (
  <span className={cn("flex-1 truncate text-left", className)} {...props} />
);
