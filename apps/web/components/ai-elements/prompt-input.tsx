"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ChatStatus, FileUIPart } from "ai";
import {
  ArrowUpIcon,
  ImageIcon,
  Loader2Icon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import {
  type ChangeEvent,
  type ChangeEventHandler,
  Children,
  type ClipboardEventHandler,
  type ComponentProps,
  createContext,
  type FormEvent,
  type FormEventHandler,
  Fragment,
  type HTMLAttributes,
  type KeyboardEventHandler,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================================
// Provider Context & Types (Logic Unchanged)
// ============================================================================

export type AttachmentsContext = {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

export type TextInputContext = {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
};

export type PromptInputControllerProps = {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
  /** INTERNAL: Allows PromptInput to register its file textInput + "open" callback */
  __registerFileInput: (
    ref: RefObject<HTMLInputElement | null>,
    open: () => void
  ) => void;
};

const PromptInputController = createContext<PromptInputControllerProps | null>(
  null
);
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(
  null
);

export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use usePromptInputController()."
    );
  }
  return ctx;
};

const useOptionalPromptInputController = () =>
  useContext(PromptInputController);

export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use useProviderAttachments()."
    );
  }
  return ctx;
};

const useOptionalProviderAttachments = () =>
  useContext(ProviderAttachmentsContext);

export type PromptInputProviderProps = PropsWithChildren<{
  initialInput?: string;
}>;

export function PromptInputProvider({
  initialInput: initialTextInput = "",
  children,
}: PromptInputProviderProps) {
  const [textInput, setTextInput] = useState(initialTextInput);
  const clearInput = useCallback(() => setTextInput(""), []);

  const [attachmentFiles, setAttachmentFiles] = useState<
    (FileUIPart & { id: string })[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef<() => void>(() => {});

  const add = useCallback((files: File[] | FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) {
      return;
    }

    setAttachmentFiles((prev) =>
      prev.concat(
        incoming.map((file) => ({
          id: nanoid(),
          type: "file" as const,
          url: URL.createObjectURL(file),
          mediaType: file.type,
          filename: file.name,
        }))
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setAttachmentFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAttachmentFiles((prev) => {
      for (const f of prev) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }
      return [];
    });
  }, []);

  const attachmentsRef = useRef(attachmentFiles);
  attachmentsRef.current = attachmentFiles;

  useEffect(() => {
    return () => {
      for (const f of attachmentsRef.current) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }
    };
  }, []);

  const openFileDialog = useCallback(() => {
    openRef.current?.();
  }, []);

  const attachments = useMemo<AttachmentsContext>(
    () => ({
      files: attachmentFiles,
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef,
    }),
    [attachmentFiles, add, remove, clear, openFileDialog]
  );

  const __registerFileInput = useCallback(
    (ref: RefObject<HTMLInputElement | null>, open: () => void) => {
      fileInputRef.current = ref.current;
      openRef.current = open;
    },
    []
  );

  const controller = useMemo<PromptInputControllerProps>(
    () => ({
      textInput: {
        value: textInput,
        setInput: setTextInput,
        clear: clearInput,
      },
      attachments,
      __registerFileInput,
    }),
    [textInput, clearInput, attachments, __registerFileInput]
  );

  return (
    <PromptInputController.Provider value={controller}>
      <ProviderAttachmentsContext.Provider value={attachments}>
        {children}
      </ProviderAttachmentsContext.Provider>
    </PromptInputController.Provider>
  );
}

// ============================================================================
// Component Context & Hooks
// ============================================================================

const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = provider ?? local;
  if (!context) {
    throw new Error(
      "usePromptInputAttachments must be used within a PromptInput or PromptInputProvider"
    );
  }
  return context;
};

export type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart & { id: string };
  className?: string;
};

export function PromptInputAttachment({
  data,
  className,
  ...props
}: PromptInputAttachmentProps) {
  const attachments = usePromptInputAttachments();

  const filename = data.filename || "";
  const mediaType =
    data.mediaType?.startsWith("image/") && data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");

  return (
    <PromptInputHoverCard>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            "group relative flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg border px-2.5 font-medium text-sm transition-all",
            // Light: Light gray background
            "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900",
            // Dark: Dark gray background
            "dark:bg-zinc-800/80 dark:border-zinc-700/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            className
          )}
          key={data.id}
          {...props}
        >
          <div className="relative size-5 shrink-0">
            <div className="absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-black/5 dark:bg-black/20 transition-opacity group-hover:opacity-0">
              {isImage ? (
                <img
                  alt={filename || "attachment"}
                  className="size-5 object-cover"
                  height={20}
                  src={data.url}
                  width={20}
                />
              ) : (
                <div className="flex size-5 items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <PaperclipIcon className="size-3" />
                </div>
              )}
            </div>
            <Button
              aria-label="Remove attachment"
              className={cn(
                "absolute inset-0 size-5 cursor-pointer rounded-full p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-3",
                "hover:bg-zinc-300 text-zinc-500 hover:text-zinc-900", // Light
                "dark:hover:bg-zinc-700 dark:text-zinc-300 dark:hover:text-white" // Dark
              )}
              onClick={(e) => {
                e.stopPropagation();
                attachments.remove(data.id);
              }}
              type="button"
              variant="ghost"
            >
              <XIcon />
              <span className="sr-only">Remove</span>
            </Button>
          </div>

          <span className="flex-1 truncate text-xs">
            {attachmentLabel}
          </span>
        </div>
      </HoverCardTrigger>
      
      <PromptInputHoverCardContent className="w-auto p-2">
         {/* ... Content ... */}
         <div className="w-auto space-y-3">
          {isImage && (
            <div className="flex max-h-96 w-96 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-black/40">
              <img
                alt={filename || "attachment preview"}
                className="max-h-full max-w-full object-contain"
                height={384}
                src={data.url}
                width={448}
              />
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1 space-y-1 px-0.5">
              <h4 className="truncate font-semibold text-sm leading-none">
                {filename || (isImage ? "Image" : "Attachment")}
              </h4>
              {data.mediaType && (
                <p className="truncate font-mono text-zinc-500 text-xs">
                  {data.mediaType}
                </p>
              )}
            </div>
          </div>
        </div>
      </PromptInputHoverCardContent>
    </PromptInputHoverCard>
  );
}

export type PromptInputAttachmentsProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: (attachment: FileUIPart & { id: string }) => ReactNode;
};

export function PromptInputAttachments({
  children,
  className,
  ...props
}: PromptInputAttachmentsProps) {
  const attachments = usePromptInputAttachments();

  if (!attachments.files.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 pt-4 pb-0 w-full",
        className
      )}
      {...props}
    >
      {attachments.files.map((file) => (
        <Fragment key={file.id}>{children(file)}</Fragment>
      ))}
    </div>
  );
}

export type PromptInputActionAddAttachmentsProps = ComponentProps<
  typeof DropdownMenuItem
> & {
  label?: string;
};

export const PromptInputActionAddAttachments = ({
  label = "Add photos or files",
  ...props
}: PromptInputActionAddAttachmentsProps) => {
  const attachments = usePromptInputAttachments();

  return (
    <DropdownMenuItem
      {...props}
      onSelect={(e) => {
        e.preventDefault();
        attachments.openFileDialog();
      }}
    >
      <ImageIcon className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
};

export type PromptInputMessage = {
  text: string;
  files: FileUIPart[];
};

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => void | Promise<void>;
};

export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  syncHiddenInput,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const files = usingProvider ? controller.attachments.files : items;
  const filesRef = useRef(files);
  filesRef.current = files;

  const openFileDialogLocal = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const matchesAccept = useCallback(
    (f: File) => {
      if (!accept || accept.trim() === "") return true;
      if (accept.includes("image/*")) return f.type.startsWith("image/");
      return true;
    },
    [accept]
  );

  const addLocal = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = Array.from(fileList);
      const accepted = incoming.filter((f) => matchesAccept(f));
       if (incoming.length && accepted.length === 0) {
        onError?.({ code: "accept", message: "No files match the accepted types." });
        return;
      }
      const withinSize = (f: File) => maxFileSize ? f.size <= maxFileSize : true;
      const sized = accepted.filter(withinSize);
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({ code: "max_file_size", message: "All files exceed the maximum size." });
        return;
      }

      setItems((prev) => {
        const capacity = typeof maxFiles === "number" ? Math.max(0, maxFiles - prev.length) : undefined;
        const capped = typeof capacity === "number" ? sized.slice(0, capacity) : sized;
        if (typeof capacity === "number" && sized.length > capacity) {
          onError?.({ code: "max_files", message: "Too many files. Some were not added." });
        }
        const next: (FileUIPart & { id: string })[] = [];
        for (const file of capped) {
          next.push({
            id: nanoid(),
            type: "file",
            url: URL.createObjectURL(file),
            mediaType: file.type,
            filename: file.name,
          });
        }
        return prev.concat(next);
      });
    },
    [matchesAccept, maxFiles, maxFileSize, onError]
  );

  const removeLocal = useCallback(
    (id: string) =>
      setItems((prev) => {
        const found = prev.find((file) => file.id === id);
        if (found?.url) URL.revokeObjectURL(found.url);
        return prev.filter((file) => file.id !== id);
      }),
    []
  );

  const clearLocal = useCallback(
    () =>
      setItems((prev) => {
        for (const file of prev) {
          if (file.url) URL.revokeObjectURL(file.url);
        }
        return [];
      }),
    []
  );

  const add = usingProvider ? controller.attachments.add : addLocal;
  const remove = usingProvider ? controller.attachments.remove : removeLocal;
  const clear = usingProvider ? controller.attachments.clear : clearLocal;
  const openFileDialog = usingProvider
    ? controller.attachments.openFileDialog
    : openFileDialogLocal;

  useEffect(() => {
    if (!usingProvider) return;
    controller.__registerFileInput(inputRef, () => inputRef.current?.click());
  }, [usingProvider, controller]);

  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = "";
    }
  }, [files, syncHiddenInput]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("drop", onDrop);
    return () => {
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("drop", onDrop);
    };
  }, [add]);

  useEffect(() => {
    if (!globalDrop) return;
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop]);

  useEffect(
    () => () => {
      if (!usingProvider) {
        for (const f of filesRef.current) {
          if (f.url) URL.revokeObjectURL(f.url);
        }
      }
    },
    [usingProvider]
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) add(event.currentTarget.files);
    event.currentTarget.value = "";
  };

  const convertBlobUrlToDataUrl = async (
    url: string
  ): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const ctx = useMemo<AttachmentsContext>(
    () => ({
      files: files.map((item) => ({ ...item, id: item.id })),
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef: inputRef,
    }),
    [files, add, remove, clear, openFileDialog]
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = usingProvider
      ? controller.textInput.value
      : (() => {
          const formData = new FormData(form);
          return (formData.get("message") as string) || "";
        })();

    if (!usingProvider) form.reset();

    Promise.all(
      files.map(async ({ id: _id, ...item }) => {
        if (item.url && item.url.startsWith("blob:")) {
          const dataUrl = await convertBlobUrlToDataUrl(item.url);
          return { ...item, url: dataUrl ?? item.url };
        }
        return item;
      })
    )
      .then((convertedFiles: FileUIPart[]) => {
        try {
          const result = onSubmit({ text, files: convertedFiles }, event);
          if (result instanceof Promise) {
            result
              .then(() => {
                clear();
                if (usingProvider) controller.textInput.clear();
              })
              .catch(() => {});
          } else {
            clear();
            if (usingProvider) controller.textInput.clear();
          }
        } catch {}
      })
      .catch(() => {});
  };

  const inner = (
    <>
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title="Upload files"
        type="file"
      />
      <form
        className={cn("w-full transition-all", className)}
        onSubmit={handleSubmit}
        ref={formRef}
        {...props}
      >
        <InputGroup
          className={cn(
            "relative flex flex-col overflow-hidden shadow-sm",
            "rounded-[26px] border transition-all duration-300 ease-in-out",
            
            // Light
            "bg-white border-zinc-200",
            "focus-within:border-zinc-300 focus-within:ring-1 focus-within:ring-zinc-200 focus-within:shadow-xl",
            
            // Dark
            "dark:bg-zinc-900 dark:border-zinc-800",
            "dark:focus-within:border-zinc-700 dark:focus-within:ring-zinc-700/50",
            
            // 确保有 block-start 和 block-end 时高度自适应
            "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-end]]:h-auto"
          )}
        >
          {children}
        </InputGroup>
      </form>
    </>
  );

  return usingProvider ? (
    inner
  ) : (
    <LocalAttachmentsContext.Provider value={ctx}>
      {inner}
    </LocalAttachmentsContext.Provider>
  );
};

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputBody = ({
  className,
  ...props
}: PromptInputBodyProps) => (
  <div className={cn("contents", className)} {...props} />
);

export type PromptInputTextareaProps = ComponentProps<
  typeof InputGroupTextarea
>;

export const PromptInputTextarea = ({
  onChange,
  className,
  placeholder = "Ask v0 to build...",
  ...props
}: PromptInputTextareaProps) => {
  const controller = useOptionalPromptInputController();
  const attachments = usePromptInputAttachments();
  const [isComposing, setIsComposing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 检测是否需要展开（超过一行）
  const checkExpansion = useCallback((value: string) => {
    // 检查是否有换行符，或者文本长度超过一定阈值
    const hasLineBreak = value.includes('\n');
    const isLongText = value.length > 80; // 大约一行的字符数
    
    setIsExpanded(hasLineBreak || isLongText);
  }, []);

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter") {
      if (isComposing || e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;
      e.preventDefault();
      const form = e.currentTarget.form;
      const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      if (submitButton?.disabled) return;
      form?.requestSubmit();
    }
    if (e.key === "Backspace" && e.currentTarget.value === "" && attachments.files.length > 0) {
      e.preventDefault();
      const lastAttachment = attachments.files.at(-1);
      if (lastAttachment) attachments.remove(lastAttachment.id);
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      event.preventDefault();
      attachments.add(files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.currentTarget.value;
    checkExpansion(value);
    if (controller) {
      controller.textInput.setInput(value);
    }
    onChange?.(e);
  };

  const controlledProps = controller
    ? {
        value: controller.textInput.value,
        onChange: handleChange,
      }
    : { onChange: handleChange };

  // 当值变化时检查是否需要展开
  useEffect(() => {
    const value = controller?.textInput.value || '';
    checkExpansion(value);
  }, [controller?.textInput.value, checkExpansion]);

  return (
    <InputGroupTextarea
      ref={textareaRef}
      style={
        {
          height: isExpanded ? '160px' : '44px',
          minHeight: isExpanded ? '160px' : '44px',
          maxHeight: isExpanded ? '160px' : '44px',
          fieldSizing: 'content',
        } as React.CSSProperties
      }
      className={cn(
        "w-full resize-none border-0 bg-transparent px-5 text-base shadow-none outline-none transition-all duration-200",
        
        // Light
        "text-zinc-900 placeholder:text-zinc-500 caret-zinc-900 selection:bg-zinc-200 selection:text-zinc-900",
        // Dark
        "dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:caret-white dark:selection:bg-zinc-700 dark:selection:text-white",
        
        "focus-visible:ring-0 focus-visible:ring-offset-0",
        // 两种固定高度状态 - 减少内边距让文本更靠近边框
        isExpanded ? "py-2 overflow-y-auto" : "py-2 overflow-hidden",
        
        // 自定义滚动条样式（仅在展开时显示）
        isExpanded && [
          "[&::-webkit-scrollbar]:w-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          // Light Scrollbar
          "[&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-zinc-400",
          // Dark Scrollbar
          "dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 dark:[&::-webkit-scrollbar-thumb]:hover:bg-zinc-600",
        ],
        className
      )}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      {...props}
      {...controlledProps}
    />
  );
};

export type PromptInputHeaderProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export const PromptInputHeader = ({
  className,
  ...props
}: PromptInputHeaderProps) => (
  <InputGroupAddon
    align="block-start"
    className={cn("order-first flex-wrap gap-2 px-3 pt-2", className)}
    {...props}
  />
);

export type PromptInputFooterProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export const PromptInputFooter = ({
  className,
  ...props
}: PromptInputFooterProps) => (
  <InputGroupAddon
    align="block-end"
    className={cn("justify-between gap-2 px-3 pb-2", className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div className={cn("flex items-center gap-2 ml-1", className)} {...props} />
);

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton>;
export const PromptInputButton = ({
  variant = "ghost",
  className,
  size,
  ...props
}: PromptInputButtonProps) => {
  const newSize = size ?? (Children.count(props.children) > 1 ? "sm" : "icon-sm");
  return (
    <InputGroupButton
      className={cn(
        "rounded-full transition-all duration-200", 
        // Light
        "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
        // Dark
        "dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800",
        className
      )}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
};

export type PromptInputActionMenuProps = ComponentProps<typeof DropdownMenu>;
export const PromptInputActionMenu = (props: PromptInputActionMenuProps) => (
  <DropdownMenu {...props} />
);

export type PromptInputActionMenuTriggerProps = PromptInputButtonProps;
export const PromptInputActionMenuTrigger = ({
  className,
  children,
  ...props
}: PromptInputActionMenuTriggerProps) => (
  <DropdownMenuTrigger asChild>
    <PromptInputButton className={className} {...props}>
      {children ?? <PlusIcon className="size-4" />}
    </PromptInputButton>
  </DropdownMenuTrigger>
);

export type PromptInputActionMenuContentProps = ComponentProps<
  typeof DropdownMenuContent
>;
export const PromptInputActionMenuContent = ({
  className,
  ...props
}: PromptInputActionMenuContentProps) => (
  <DropdownMenuContent 
    align="start" 
    className={cn(
      "rounded-xl",
      // Light
      "bg-white border-zinc-200 text-zinc-700",
      // Dark
      "dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300", 
      className
    )} 
    {...props} 
  />
);

export type PromptInputActionMenuItemProps = ComponentProps<
  typeof DropdownMenuItem
>;
export const PromptInputActionMenuItem = ({
  className,
  ...props
}: PromptInputActionMenuItemProps) => (
  <DropdownMenuItem 
    className={cn(
      "rounded-lg cursor-pointer",
      // Light
      "focus:bg-zinc-100 focus:text-zinc-900",
      // Dark
      "dark:focus:bg-zinc-800 dark:focus:text-white",
      className
    )} 
    {...props} 
  />
);

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
};

export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let Icon = <ArrowUpIcon className="size-4" />;
  let ariaLabel = "Send message";

  if (status === "submitted") {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
    ariaLabel = "Sending message";
  } else if (status === "streaming") {
    Icon = <SquareIcon className="size-4" />;
    ariaLabel = "Stop generating";
  } else if (status === "error") {
    Icon = <XIcon className="size-4" />;
    ariaLabel = "Retry send";
  }

  return (
    <InputGroupButton
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "size-8 rounded-full p-0 transition-colors duration-200 shadow-none",
        // Default / hover
        "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 hover:text-zinc-900",
        // Disabled
        "disabled:bg-zinc-100 disabled:text-zinc-400 disabled:opacity-100 disabled:cursor-not-allowed",
        // Dark mode default / hover / disabled
        "dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-zinc-50",
        "dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600",
        // Sending
        status === "submitted" &&
          "bg-zinc-300 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700",
        // Streaming (stop)
        status === "streaming" &&
          "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/35 dark:text-amber-200 dark:hover:bg-amber-900/50",
        // Error (retry)
        status === "error" &&
          "bg-zinc-300 text-zinc-700 hover:bg-zinc-400 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600",
        className
      )}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </InputGroupButton>
  );
};

// ... Speech components & Hooks ...
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
};

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export type PromptInputSpeechButtonProps = ComponentProps<
  typeof PromptInputButton
> & {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onTranscriptionChange?: (text: string) => void;
};

export const PromptInputSpeechButton = ({
  className,
  textareaRef,
  onTranscriptionChange,
  ...props
}: PromptInputSpeechButtonProps) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const speechRecognition = new SpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = "en-US";
      speechRecognition.onstart = () => setIsListening(true);
      speechRecognition.onend = () => setIsListening(false);
      speechRecognition.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalTranscript += result[0]?.transcript ?? "";
        }
        if (finalTranscript && textareaRef?.current) {
          const textarea = textareaRef.current;
          textarea.value = textarea.value + (textarea.value ? " " : "") + finalTranscript;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          onTranscriptionChange?.(textarea.value);
        }
      };
      speechRecognition.onerror = (event) => {
        console.error("Speech error:", event.error);
        setIsListening(false);
      };
      recognitionRef.current = speechRecognition;
      setRecognition(speechRecognition);
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [textareaRef, onTranscriptionChange]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else recognition.start();
  }, [recognition, isListening]);

  return (
    <PromptInputButton
      className={cn(
        "relative rounded-full transition-all duration-200",
        isListening && [
          "animate-pulse",
          "bg-red-100 text-red-600 hover:bg-red-200", // Light
          "dark:bg-red-500/20 dark:text-red-500 dark:hover:bg-red-500/30" // Dark
        ],
        className
      )}
      disabled={!recognition}
      onClick={toggleListening}
      {...props}
    >
      <MicIcon className="size-4" />
    </PromptInputButton>
  );
};

// ... Select Components updated for dark/light theme ...

export type PromptInputSelectProps = ComponentProps<typeof Select>;
export const PromptInputSelect = (props: PromptInputSelectProps) => <Select {...props} />;

export type PromptInputSelectTriggerProps = ComponentProps<typeof SelectTrigger>;
export const PromptInputSelectTrigger = ({
  className,
  ...props
}: PromptInputSelectTriggerProps) => (
  <SelectTrigger
    className={cn(
      "h-8 rounded-full border-none bg-transparent px-3 font-medium text-xs shadow-none transition-colors",
      // Light
      "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900",
      // Dark
      "dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:data-[state=open]:bg-zinc-800 dark:data-[state=open]:text-white",
      className
    )}
    {...props}
  />
);

export type PromptInputSelectContentProps = ComponentProps<typeof SelectContent>;
export const PromptInputSelectContent = ({
  className,
  ...props
}: PromptInputSelectContentProps) => (
  <SelectContent 
    className={cn(
      "bg-white border-zinc-200 text-zinc-700", // Light
      "dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300", // Dark
      className
    )} 
    {...props} 
  />
);

export type PromptInputSelectItemProps = ComponentProps<typeof SelectItem>;
export const PromptInputSelectItem = ({
  className,
  ...props
}: PromptInputSelectItemProps) => (
  <SelectItem 
    className={cn(
      "cursor-pointer",
      "focus:bg-zinc-100 focus:text-zinc-900", // Light
      "dark:focus:bg-zinc-800 dark:focus:text-white", // Dark
      className
    )} 
    {...props} 
  />
);

export type PromptInputSelectValueProps = ComponentProps<typeof SelectValue>;
export const PromptInputSelectValue = ({
  className,
  ...props
}: PromptInputSelectValueProps) => (
  <SelectValue className={cn(className)} {...props} />
);

// ... Wrappers for Command, Tabs, HoverCard ...

export type PromptInputHoverCardProps = ComponentProps<typeof HoverCard>;
export const PromptInputHoverCard = (props: PromptInputHoverCardProps) => <HoverCard {...props} />;

export type PromptInputHoverCardTriggerProps = ComponentProps<typeof HoverCardTrigger>;
export const PromptInputHoverCardTrigger = (props: PromptInputHoverCardTriggerProps) => <HoverCardTrigger {...props} />;

export type PromptInputHoverCardContentProps = ComponentProps<typeof HoverCardContent>;
export const PromptInputHoverCardContent = ({ align = "start", className, ...props }: PromptInputHoverCardContentProps) => (
  <HoverCardContent 
    align={align} 
    className={cn(
      "bg-white border-zinc-200 text-zinc-900", // Light
      "dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300", // Dark
      className
    )} 
    {...props} 
  />
);

export type PromptInputTabsListProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTabsList = ({ className, ...props }: PromptInputTabsListProps) => <div className={cn(className)} {...props} />;

export type PromptInputTabProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTab = ({ className, ...props }: PromptInputTabProps) => <div className={cn(className)} {...props} />;

export type PromptInputTabLabelProps = HTMLAttributes<HTMLHeadingElement>;
export const PromptInputTabLabel = ({ className, ...props }: PromptInputTabLabelProps) => (
  <h3 className={cn("mb-2 px-3 font-medium text-xs text-zinc-500", className)} {...props} />
);

export type PromptInputTabBodyProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTabBody = ({ className, ...props }: PromptInputTabBodyProps) => (
  <div className={cn("space-y-1", className)} {...props} />
);

export type PromptInputTabItemProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTabItem = ({ className, ...props }: PromptInputTabItemProps) => (
  <div 
    className={cn(
      "flex items-center gap-2 px-3 py-2 text-xs rounded-md cursor-pointer",
      "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900", // Light
      "dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white", // Dark
      className
    )} 
    {...props} 
  />
);

// Command Palette Styles
export type PromptInputCommandProps = ComponentProps<typeof Command>;
export const PromptInputCommand = ({ className, ...props }: PromptInputCommandProps) => (
  <Command 
    className={cn(
      "bg-white border-zinc-200", // Light
      "dark:bg-zinc-900 dark:border-zinc-800", // Dark
      className
    )} 
    {...props} 
  />
);
export type PromptInputCommandInputProps = ComponentProps<typeof CommandInput>;
export const PromptInputCommandInput = ({ className, ...props }: PromptInputCommandInputProps) => (
  <CommandInput 
    className={cn(
      "text-zinc-900 placeholder:text-zinc-500", // Light
      "dark:text-zinc-100 dark:placeholder:text-zinc-500", // Dark
      className
    )} 
    {...props} 
  />
);
export type PromptInputCommandListProps = ComponentProps<typeof CommandList>;
export const PromptInputCommandList = ({ className, ...props }: PromptInputCommandListProps) => (
  <CommandList className={cn(className)} {...props} />
);
export type PromptInputCommandEmptyProps = ComponentProps<typeof CommandEmpty>;
export const PromptInputCommandEmpty = ({ className, ...props }: PromptInputCommandEmptyProps) => (
  <CommandEmpty className={cn("text-zinc-500", className)} {...props} />
);
export type PromptInputCommandGroupProps = ComponentProps<typeof CommandGroup>;
export const PromptInputCommandGroup = ({ className, ...props }: PromptInputCommandGroupProps) => (
  <CommandGroup className={cn("text-zinc-500 dark:text-zinc-400", className)} {...props} />
);
export type PromptInputCommandItemProps = ComponentProps<typeof CommandItem>;
export const PromptInputCommandItem = ({ className, ...props }: PromptInputCommandItemProps) => (
  <CommandItem 
    className={cn(
      "aria-selected:bg-zinc-100 aria-selected:text-zinc-900", // Light
      "dark:aria-selected:bg-zinc-800 dark:aria-selected:text-white", // Dark
      className
    )} 
    {...props} 
  />
);
export type PromptInputCommandSeparatorProps = ComponentProps<typeof CommandSeparator>;
export const PromptInputCommandSeparator = ({ className, ...props }: PromptInputCommandSeparatorProps) => (
  <CommandSeparator 
    className={cn(
      "bg-zinc-200", // Light
      "dark:bg-zinc-800", // Dark
      className
    )} 
    {...props} 
  />
);
