"use client";

import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export type ServiceMarkKey =
  | "boss"
  | "twitter"
  | "bilibili"
  | "xiaohongshu"
  | "excalidraw"
  | "notion"
  | "github"
  | "gmail"
  | "google-calendar"
  | "google-drive"
  | "figma";

const SERVICE_MARK_ALIASES: Record<ServiceMarkKey, readonly string[]> = {
  boss: ["@z0/boss", "packages/boss", "boss", "boss直聘", "直聘"],
  twitter: ["@z0/twitter", "packages/twitter", "twitter", "x", "x.com"],
  bilibili: ["@z0/bilibili", "packages/bilibili", "bilibili", "b站"],
  xiaohongshu: [
    "@z0/xiaohongshu",
    "packages/xiaohongshu",
    "xiaohongshu",
    "xhs",
    "小红书",
  ],
  excalidraw: ["excalidraw"],
  notion: ["notion"],
  github: ["github"],
  gmail: ["gmail"],
  "google-calendar": ["google-calendar", "google calendar", "calendar"],
  "google-drive": ["google-drive", "google drive", "drive"],
  figma: ["figma"],
};

const SERVICE_MARK_SURFACES: Record<ServiceMarkKey, string> = {
  boss:
    "border-zinc-300/80 bg-white text-[#00B7A8] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  twitter:
    "border-zinc-300/80 bg-white text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  bilibili:
    "border-sky-300/50 bg-white text-[#00A1D6] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  xiaohongshu:
    "border-rose-300/40 bg-white text-[#FF2442] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  excalidraw:
    "border-amber-300/40 bg-white text-[#6965DB] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  notion:
    "border-zinc-300/80 bg-white text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  github:
    "border-zinc-300/80 bg-white text-[#181717] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  gmail:
    "border-zinc-300/80 bg-white text-[#EA4335] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  "google-calendar":
    "border-zinc-300/80 bg-white text-[#4285F4] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  "google-drive":
    "border-zinc-300/80 bg-white text-[#4285F4] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  figma:
    "border-zinc-300/80 bg-white text-[#F24E1E] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
};

const SERVICE_MARK_ASSETS: Partial<Record<ServiceMarkKey, string>> = {
  boss: "/brand/services/boss.svg",
  twitter: "/brand/services/x.svg",
  bilibili: "/brand/services/bilibili.svg",
  xiaohongshu: "/brand/services/xiaohongshu.svg",
  excalidraw: "/brand/services/connectors/excalidraw.svg",
  notion: "/brand/services/connectors/notion.svg",
  github: "/brand/services/connectors/github.svg",
  gmail: "/brand/services/connectors/gmail.svg",
  "google-calendar": "/brand/services/connectors/google-calendar.svg",
  "google-drive": "/brand/services/connectors/google-drive.svg",
  figma: "/brand/services/connectors/figma.svg",
};

export function resolveServiceMarkKey(
  ...values: Array<string | null | undefined>
): ServiceMarkKey | null {
  const normalizedValues = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());

  if (normalizedValues.length === 0) {
    return null;
  }

  for (const [key, aliases] of Object.entries(SERVICE_MARK_ALIASES) as Array<
    [ServiceMarkKey, readonly string[]]
  >) {
    if (
      aliases.some((alias) => {
        const normalizedAlias = alias.toLowerCase();
        return normalizedValues.some((value) => {
          if (value === normalizedAlias) {
            return true;
          }

          return normalizedAlias.length >= 4 && value.includes(normalizedAlias);
        });
      })
    ) {
      return key;
    }
  }

  return null;
}

export function ServiceMark({
  serviceKey,
  className,
  svgClassName,
}: {
  serviceKey: ServiceMarkKey;
  className?: string;
  svgClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border",
        SERVICE_MARK_SURFACES[serviceKey],
        className,
      )}
      aria-hidden="true"
    >
      <ServiceMarkGlyph serviceKey={serviceKey} className={svgClassName} />
    </div>
  );
}

function ServiceMarkGlyph({
  serviceKey,
  className,
}: {
  serviceKey: ServiceMarkKey;
  className?: string;
}) {
  const assetPath = SERVICE_MARK_ASSETS[serviceKey];

  if (assetPath) {
    return (
      <span
        className={cn("block size-5 bg-current", className)}
        style={{
          WebkitMaskImage: `url(${assetPath})`,
          maskImage: `url(${assetPath})`,
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />
    );
  }

  const props = {
    className: cn("size-5", className),
  };

  if (serviceKey === "boss") {
    return <BossMark {...props} />;
  }
  if (serviceKey === "twitter") {
    return <TwitterMark {...props} />;
  }
  if (serviceKey === "bilibili") {
    return <BilibiliMark {...props} />;
  }
  return <XiaohongshuMark {...props} />;
}

function BossMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M8.5 8.75V7.5A2.5 2.5 0 0 1 11 5h2a2.5 2.5 0 0 1 2.5 2.5v1.25"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="4.75"
        y="8.75"
        width="14.5"
        height="10.5"
        rx="2.5"
        strokeWidth="1.8"
      />
      <path
        d="M4.75 13h14.5M12 12.2v2.6"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TwitterMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5.5 4.75h3.45l3.67 5.24 4.9-5.24h1.98l-5.97 6.39 4.97 7.11h-3.44l-3.98-5.68-5.3 5.68H4.81l6.37-6.83-4.7-6.67Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BilibiliMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M9 5.75 7.3 7.6M15 5.75l1.7 1.85"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="4.75"
        y="7.75"
        width="14.5"
        height="10.5"
        rx="2.8"
        strokeWidth="1.8"
      />
      <path
        d="M9.25 11.5v2.25M14.75 11.5v2.25M8.5 15.75h7"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function XiaohongshuMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path
        d="M7.25 9.25c1.1-1.4 2.5-1.95 3.7-1.35 1.55.78.88 2.75-.3 3.7-1.55 1.23-2.9 1.62-3.15 3.1"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.9 8.55c1.25-1.15 2.8-1.42 3.82-.58 1.16.96.72 2.74-.48 3.54-1.88 1.25-3.65 1.2-4.49 3.94"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 16.7c.9.65 2.05 1 3.35 1 2.02 0 3.88-.88 5-2.4"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}
