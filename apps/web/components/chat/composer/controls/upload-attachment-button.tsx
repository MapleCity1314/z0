"use client";

import { Upload } from "lucide-react";
import {
  PromptInputButton,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";

export function UploadAttachmentButton() {
  const { attachments } = usePromptInputController();

  return (
    <PromptInputButton
      onClick={attachments.openFileDialog}
      title="Upload file"
      aria-label="Upload file"
    >
      <Upload className="size-4" />
    </PromptInputButton>
  );
}
