// @/components/logo.tsx
"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type LogoProps = ComponentProps<"svg"> & {
  size?: number;
};

export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-white", className)}
      {...props}
    >
      {/* Z 路径 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 12H17.5V16L10.4 24H17.5V28H5V24L12.1 16H5V12H10Z"
        fill="currentColor"
      />
      {/* 0 的路径 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M23 12C20.7909 12 19 13.7909 19 16V24C19 26.2091 20.7909 28 23 28H31C33.2091 28 35 26.2091 35 24V16C35 13.7909 33.2091 12 31 12H23ZM31 16H23V24H31V16Z"
        fill="currentColor"
      />
      {/* 0 中间的斜杠 */}
      <path
        d="M29.5 15L24.5 25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 保留旧的 SVG 字符串以兼容现有代码
export const logoSvg = `
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M10 12H17.5V16L10.4 24H17.5V28H5V24L12.1 16H5V12H10Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M23 12C20.7909 12 19 13.7909 19 16V24C19 26.2091 20.7909 28 23 28H31C33.2091 28 35 26.2091 35 24V16C35 13.7909 33.2091 12 31 12H23ZM31 16H23V24H31V16Z" fill="currentColor"/>
    <path d="M29.5 15L24.5 25" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;
