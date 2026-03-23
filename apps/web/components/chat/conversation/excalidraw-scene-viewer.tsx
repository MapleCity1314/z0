"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-500">
        Loading Excalidraw...
      </div>
    ),
  },
);

type ExcalidrawScene = ExcalidrawInitialDataState;
type SceneElement = { id: string } & Record<string, unknown>;

export function isExcalidrawScene(value: unknown): value is ExcalidrawScene {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scene = value as Record<string, unknown>;
  return Array.isArray(scene.elements);
}

export function getExcalidrawScene(
  output: Record<string, any> | undefined,
): ExcalidrawScene | null {
  const structuredContent = output?.structuredContent;
  if (isExcalidrawScene(structuredContent)) {
    return structuredContent;
  }

  const textContent = output?.content?.find?.(
    (item: { type?: string }) => item?.type === "text",
  )?.text;

  if (typeof textContent !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(textContent);
    return isExcalidrawScene(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ExcalidrawSceneViewer({
  scene,
  toolCallId,
}: {
  scene: ExcalidrawScene;
  toolCallId?: string;
}) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const activeToolCallIdRef = useRef<string | null>(null);
  const normalizedScene: ExcalidrawInitialDataState = {
    type: "excalidraw/scene",
    version: typeof scene.version === "number" ? scene.version : 1,
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    appState: {
      viewBackgroundColor: scene.appState?.viewBackgroundColor ?? "#ffffff",
      ...(scene.appState ?? {}),
    },
    files: scene.files ?? {},
    libraryItems: scene.libraryItems,
    scrollToContent: scene.scrollToContent,
  };

  const mergeElements = (
    currentElements: readonly SceneElement[],
    nextElements: readonly SceneElement[],
  ) => {
    const mergedById = new Map<string, SceneElement>();

    currentElements.forEach((element) => {
      mergedById.set(element.id, element);
    });

    nextElements.forEach((element) => {
      mergedById.set(element.id, element);
    });

    return Array.from(mergedById.values());
  };

  useEffect(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

    const nextElements = (normalizedScene.elements ?? []) as readonly SceneElement[];
    const shouldResetScene =
      !!toolCallId && activeToolCallIdRef.current !== toolCallId;

    if (shouldResetScene) {
      activeToolCallIdRef.current = toolCallId;
      api.updateScene({
        elements: nextElements as never,
      });
    } else {
      const currentElements = api.getSceneElementsIncludingDeleted();
      api.updateScene({
        elements: mergeElements(
          currentElements as unknown as readonly SceneElement[],
          nextElements,
        ) as never,
      });
    }

    api.updateScene({
      appState: normalizedScene.appState
        ? {
            viewBackgroundColor:
              normalizedScene.appState.viewBackgroundColor ?? "#ffffff",
          }
        : undefined,
    });

    if (normalizedScene.files) {
      api.addFiles(Object.values(normalizedScene.files));
    }
  }, [normalizedScene, toolCallId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="h-[420px]">
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
          initialData={normalizedScene}
          viewModeEnabled
          zenModeEnabled
          handleKeyboardGlobally={false}
          autoFocus={false}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveAsImage: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
            tools: {
              image: false,
            },
          }}
        />
      </div>
    </div>
  );
}
