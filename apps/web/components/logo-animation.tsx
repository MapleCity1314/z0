"use client";

import { cn } from "@/lib/utils";
import { motion, SVGMotionProps, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

export type LogoProps = SVGMotionProps<SVGSVGElement> & {
  size?: number;
  animated?: boolean;
  glitch?: boolean; // New prop to enable/disable glitch
};

const pathTransition = {
  duration: 1.5,
  ease: "easeInOut" as const,
  delay: 0.5,
};

// The Z and 0 path data
const zPath = "M10 12H17.5V16L10.4 24H17.5V28H5V24L12.1 16H5V12H10Z";
const zeroPath = "M23 12C20.7909 12 19 13.7909 19 16V24C19 26.2091 20.7909 28 23 28H31C33.2091 28 35 26.2091 35 24V16C35 13.7909 33.2091 12 31 12H23ZM31 16H23V24H31V16Z";
const slashPath = "M29.5 15L24.5 25";

export function Logo({ size = 32, className, animated = false, glitch = false, ...props }: LogoProps) {
  const controls = useAnimation();
  const [isGlitching, setIsGlitching] = useState(false);

  // Random Glitch Loop
  useEffect(() => {
    if (!glitch) return;

    let timeout: ReturnType<typeof setTimeout>;
    
    const triggerGlitch = () => {
      const duration = Math.random() * 200 + 50; // Short burst: 50-250ms
      const nextDelay = Math.random() * 3000 + 1000; // Wait 1-4s between glitches

      setIsGlitching(true);
      
      // Randomly animate the displacement scale to create "tearing"
      controls.start({
        attrScale: [0, 20, 0, 10, 0], // The intensity of the displacement
        transition: { duration: duration / 1000 }
      });

      timeout = setTimeout(() => {
        setIsGlitching(false);
        timeout = setTimeout(triggerGlitch, nextDelay);
      }, duration);
    };

    // Initial start delay
    timeout = setTimeout(triggerGlitch, 2000);

    return () => clearTimeout(timeout);
  }, [glitch, controls]);

  // Framer Motion Variants
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1, transition: pathTransition }
  };

  const fillVariants = {
    hidden: { fillOpacity: 0 },
    visible: { fillOpacity: 1, transition: { delay: 2, duration: 1 } }
  };

  const strokeProps = animated ? {
    stroke: "currentColor",
    strokeWidth: 0.5,
    initial: "hidden",
    animate: "visible",
  } : {};

  // Unique ID for filters to avoid conflicts if multiple logos exist
  const filterId = `glitch-filter-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("relative overflow-visible", className)}
      {...props}
    >
      <defs>
        {/* The "WebGL" Displacement Filter */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          {/* Generate random noise */}
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.5" 
            numOctaves="1" 
            result="noise" 
          >
            {/* Animate the noise seed to make it crackle */}
             {isGlitching && (
               <animate 
                 attributeName="seed" 
                 values="0;100;50;20;0" 
                 dur="0.2s" 
                 repeatCount="indefinite" 
               />
             )}
          </feTurbulence>
          
          {/* Displace the source graphic using the noise */}
          <motion.feDisplacementMap 
            in="SourceGraphic" 
            in2="noise" 
            scale="0" // We animate this via 'controls'
            xChannelSelector="R" 
            yChannelSelector="G"
            animate={controls}
            // @ts-ignore - Framer motion handles custom attributes via 'animate' control but TS complains about specific SVG attr mapping
            transition={{ type: "tween" }} 
          />
        </filter>
      </defs>

      {/* 
        LAYER 1 & 2: RGB SPLIT (Chromatic Aberration) 
        Only visible during glitch. Red shifted Left, Cyan shifted Right.
      */}
      <g style={{ opacity: isGlitching ? 0.7 : 0, mixBlendMode: 'screen' }}>
         <motion.g animate={isGlitching ? { x: -2, opacity: 1 } : { x: 0, opacity: 0 }}>
            <path d={zPath} fill="#FF004C" />
            <path d={zeroPath} fill="#FF004C" />
            <path d={slashPath} stroke="#FF004C" strokeWidth="2" strokeLinecap="round" />
         </motion.g>
         <motion.g animate={isGlitching ? { x: 2, opacity: 1 } : { x: 0, opacity: 0 }}>
            <path d={zPath} fill="#00FFFF" />
            <path d={zeroPath} fill="#00FFFF" />
            <path d={slashPath} stroke="#00FFFF" strokeWidth="2" strokeLinecap="round" />
         </motion.g>
      </g>

      {/* LAYER 3: MAIN LOGO (With Displacement Filter) */}
      <g style={{ filter: glitch ? `url(#${filterId})` : 'none' }}>
        <motion.path
          d={zPath}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          variants={animated ? { ...pathVariants, ...fillVariants } : undefined}
          {...strokeProps}
        />
        <motion.path
          d={zeroPath}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          variants={animated ? { ...pathVariants, ...fillVariants } : undefined}
          {...strokeProps}
        />
        <motion.path
          d={slashPath}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          variants={animated ? {
            hidden: { pathLength: 0, opacity: 0 },
            visible: { pathLength: 1, opacity: 1, transition: { ...pathTransition, delay: 1.2 } }
          } : undefined}
          initial={animated ? "hidden" : undefined}
          animate={animated ? "visible" : undefined}
        />
      </g>
    </motion.svg>
  );
}