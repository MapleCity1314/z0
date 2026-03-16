// @/components/logo.tsx
"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type LogoProps = ComponentProps<"svg"> & {
  size?: number;
};

// ========================================================================
// 基础构建块 (Building Blocks)
// ========================================================================

/**
 * 核心 Z 路径
 * 保持品牌一致性的锚点，所有 Logo 变体共用此 Z 形
 */
const PathZ = (
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M8 10H16.5V14L9.4 22H16.5V26H3V22L10.1 14H3V10H8Z"
    fill="currentColor"
  />
);

/**
 * Z-Coin 专用的居中 Z (调整坐标以适应圆形容器)
 */
const PathZCentered = (
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M18.5 11H26V15L18.9 23H26V27H13.5V23L20.6 15H13.5V11H18.5Z"
    fill="currentColor"
  />
);

// ========================================================================
// 1. Logo (Default / Brand)
// ========================================================================

export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-black dark:text-white", className)}
      {...props}
    >
      {/* 左侧 Z */}
      {PathZ}
      
      {/* 右侧标准 0 (胶囊形) - 代表品牌的标准形态 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21 10C18.7909 10 17 11.7909 17 14V22C17 24.2091 18.7909 26 21 26H29C31.2091 26 33 24.2091 33 22V14C33 11.7909 31.2091 10 29 10H21ZM29 14H21V22H29V14Z"
        fill="currentColor"
      />
      {/* 0 中间的斜线 - 增加识别度 */}
      <path
        d="M27.5 13L22.5 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ========================================================================
// 2. Mini (轻量版) - 圆形几何
// 寓意：灵动、快速、低功耗
// ========================================================================

export function LogoMini({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40" // 保持紧凑
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-black dark:text-white", className)}
      {...props}
    >
      {/* 左侧 Z */}
      {PathZ}

      {/* 右侧：圆形 (Circle) */}
      {/* 使用描边风格 (Outline) 进一步强调 "Mini/Lite" 的轻量感 */}
      <circle cx="25" cy="18" r="7" stroke="currentColor" strokeWidth="3" />
      
      {/* 小圆点内核 */}
      <circle cx="25" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

// ========================================================================
// 3. Pro (专业版) - 方形几何
// 寓意：框架、稳定、结构化
// ========================================================================

export function LogoPro({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-black dark:text-white", className)}
      {...props}
    >
      {PathZ}

      {/* 右侧：正方形 (Square) */}
      {/* 实心填充 + 负空间切角，强调 "Pro" 的厚重感和实体感 */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19 11H31V25H19V11ZM22 14H28V22H22V14Z" 
        fill="currentColor"
      />
      
      {/* 方形内部的十字准星 - 代表精准 */}
      <path d="M25 16V20M23 18H27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

// ========================================================================
// 4. Max (旗舰版) - 六边形/晶体
// 寓意：高密度、蜂巢、未来科技
// ========================================================================

export function LogoMax({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-black dark:text-white", className)}
      {...props}
    >
      {PathZ}

      {/* 右侧：六边形 (Hexagon) */}
      {/* 复杂的几何结构，代表最强性能 */}
      <path
        d="M25 9.5L32 13.5V22.5L25 26.5L18 22.5V13.5L25 9.5Z"
        fill="currentColor"
      />
      
      {/* 内部负空间：闪电或能量符号 */}
      <path
        d="M25 12L27 16H24L26 20L23 24L22 19H25L23 16L25 12Z"
        fill="black" // 使用 mix-blend-mode 逻辑的负空间，在暗黑模式下需要处理颜色反转
        className="dark:fill-black fill-white" // 手动反色处理：Logo是黑时孔是白，Logo是白时孔是黑
      />
    </svg>
  );
}

// ========================================================================
// 5. Coin (平台积分) - 货币形态
// ========================================================================

export function LogoCoin({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-black dark:text-white", className)}
      {...props}
    >
      {/* 硬币外圈 - 虚线描边模拟硬币齿轮 */}
      <circle cx="20" cy="19" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
      
      {/* 内圈实线 */}
      <circle cx="20" cy="19" r="10.5" stroke="currentColor" strokeWidth="1" />
      
      {/* 居中的 Z */}
      {PathZCentered}
    </svg>
  );
}

// ========================================================================
// 兼容性导出
// ========================================================================
export const logoSvg = `
  <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M8 10H16.5V14L9.4 22H16.5V26H3V22L10.1 14H3V10H8Z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M21 10C18.7909 10 17 11.7909 17 14V22C17 24.2091 18.7909 26 21 26H29C31.2091 26 33 24.2091 33 22V14C33 11.7909 31.2091 10 29 10H21ZM29 14H21V22H29V14Z" fill="currentColor"/>
    <path d="M27.5 13L22.5 23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;