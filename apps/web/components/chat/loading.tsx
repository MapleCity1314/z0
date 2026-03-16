"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { clsx } from 'clsx';
import { cn } from "@/lib/utils";

// ==========================================
// 1. 迷你版无限滚动代码 (字号调小)
// ==========================================
const ScrollingCode = () => {
  const codeLines = [
    { indent: 0, width: '40%', color: 'bg-pink-500' },
    { indent: 0, width: '30%', color: 'bg-pink-500' },
    { indent: 0, width: '0%',  color: 'transparent' },
    { indent: 0, width: '60%', color: 'bg-blue-500' },
    { indent: 1, width: '25%', color: 'bg-sky-400' },
    { indent: 1, width: '35%', color: 'bg-sky-400' },
    { indent: 0, width: '0%',  color: 'transparent' },
    { indent: 1, width: '20%', color: 'bg-purple-400' },
    { indent: 2, width: '10%', color: 'bg-orange-400' },
    { indent: 3, width: '45%', color: 'bg-emerald-500' },
    { indent: 3, width: '55%', color: 'bg-slate-500' },
    { indent: 4, width: '30%', color: 'bg-yellow-300' },
    { indent: 3, width: '10%', color: 'bg-slate-500' },
    { indent: 2, width: '10%', color: 'bg-orange-400' },
    { indent: 1, width: '5%',  color: 'bg-purple-400' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-white dark:bg-[#0d1117] flex flex-col pt-3 opacity-90 select-none transition-colors duration-300">
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white dark:from-[#0d1117] to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-[#0d1117] to-transparent z-10" />

      <motion.div
        className="flex flex-col gap-2" // 间距调小
        animate={{ y: [0, -310] }} // 根据内容高度调整
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 8,
        }}
      >
        {[...codeLines, ...codeLines, ...codeLines].map((line, i) => (
          <div key={i} className="flex items-center w-full pl-3 h-2.5">
             <div className="w-4 text-zinc-300 dark:text-slate-700 text-[8px] text-right mr-2 font-mono">
               {i % 15 + 1}
             </div>
             <div className="flex h-full mr-1">
                {Array.from({ length: line.indent }).map((_, j) => (
                  <div key={j} className="w-3 border-r border-zinc-100 dark:border-white/5 h-full mr-0.5" />
                ))}
             </div>
             {line.width !== '0%' && (
               <div 
                  className={clsx("h-1.5 rounded-[1px] opacity-60", line.color)} 
                  style={{ width: line.width }} 
               />
             )}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// ==========================================
// 2. 布局定义 (精简版 - 4个块)
// ==========================================
// 容器尺寸假设: 260 x 200
const MINI_LAYOUT = [
  { id: 'nav', type: 'nav', x: 0, y: 0, w: 260, h: 32 },       // 顶部导航
  { id: 'sidebar', type: 'sidebar', x: 0, y: 40, w: 50, h: 160 }, // 侧边栏
  { id: 'hero', type: 'hero', x: 60, y: 40, w: 190, h: 70 },      // 主内容区
  { id: 'list', type: 'list', x: 60, y: 120, w: 190, h: 80 },     // 下方列表区
];

// ==========================================
// 3. 拖拽模拟器
// ==========================================
const DragSimulator = ({ onComplete }: { onComplete: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [cursorPos, setCursorPos] = useState({ x: 130, y: 100 }); 
  const [phase, setPhase] = useState('idle'); 
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    const runSequence = async () => {
      await wait(400); 

      for (let i = 0; i < MINI_LAYOUT.length; i++) {
        const item = MINI_LAYOUT[i];
        setCurrentIndex(i);

        // 1. 移动到起点
        setPhase('moving_to_start');
        setCursorPos({ x: item.x, y: item.y });
        await wait(400); 

        // 2. 拖拽
        setPhase('dragging');
        setCursorPos({ x: item.x + item.w, y: item.y + item.h });
        
        // 小窗口动作稍微快一点
        const dragDuration = item.w > 100 ? 700 : 500; 
        await wait(dragDuration);

        // 3. 完成
        setCompletedIds(prev => [...prev, item.id]);
        await wait(100); 
      }

      await wait(1200); 
      onComplete();
    };

    runSequence();
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: "spring", stiffness: 180, damping: 24 }}
      className={cn(
        "absolute inset-0 z-20 overflow-hidden shadow-[-10px_0px_30px_rgba(0,0,0,0.5)] border-l",
        "bg-zinc-50 border-zinc-200", // Light
        "dark:bg-neutral-900 dark:border-white/10" // Dark
      )}
    >
      <div className={cn(
          "absolute inset-0 pointer-events-none",
          "opacity-[0.03] bg-[image:radial-gradient(#000_1px,transparent_1px)]", // Light pattern
          "dark:opacity-10 dark:bg-[image:radial-gradient(#fff_1px,transparent_1px)]" // Dark pattern
        )}
        style={{ backgroundSize: '16px 16px' }} 
      />

      {MINI_LAYOUT.map((item, index) => {
        const isCurrent = index === currentIndex;
        const isCompleted = completedIds.includes(item.id);
        const isDragging = isCurrent && phase === 'dragging';

        if (!isCurrent && !isCompleted) return null;

        return (
          <motion.div
            key={item.id}
            initial={{ width: 0, height: 0 }}
            animate={{ 
              width: isCompleted ? item.w : (isDragging ? item.w : 0),
              height: isCompleted ? item.h : (isDragging ? item.h : 0),
            }}
            transition={{ 
              duration: isDragging ? (item.w > 100 ? 0.7 : 0.5) : 0, 
              ease: "easeInOut" 
            }}
            style={{ left: item.x, top: item.y }}
            className={clsx(
              "absolute overflow-hidden box-border",
              isCompleted 
                ? "border bg-white border-zinc-200 dark:bg-[#161b22] dark:border-white/10" 
                : "border border-dashed border-blue-500 bg-blue-500/10 z-10" 
            )}
          >
            <AnimatePresence>
               {isCompleted && (
                 <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="w-full h-full p-2"
                 >
                    <SkeletonContent type={item.type} />
                 </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      <motion.div
        animate={{ 
          x: cursorPos.x, 
          y: cursorPos.y,
          scale: phase === 'dragging' ? 0.85 : 1
        }}
        transition={{ 
          duration: phase === 'dragging' ? (MINI_LAYOUT[currentIndex]?.w > 100 ? 0.7 : 0.5) : 0.4,
          ease: phase === 'dragging' ? "easeInOut" : "circOut",
          type: phase === 'dragging' ? "tween" : "spring"
        }}
        className="absolute z-50 pointer-events-none"
        style={{ marginTop: -2, marginLeft: -2 }}
      >
        {/* 光标调小 */}
        <MousePointer2 
          size={16} 
          className={clsx(
            "drop-shadow-lg transition-colors duration-200",
            phase === 'dragging' ? "text-blue-500 fill-blue-500/20" : "text-black fill-white/40 dark:text-white dark:fill-black/40"
          )}
        />
      </motion.div>
    </motion.div>
  );
};

// ==========================================
// 4. 迷你骨架内容
// ==========================================
const SkeletonContent = ({ type }: { type: string }) => {
  if (type === 'nav') return (
    <div className="flex items-center gap-2 h-full px-1">
      <div className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-white/10" />
      <div className="w-12 h-1.5 rounded bg-zinc-100 dark:bg-white/10" />
      <div className="ml-auto w-8 h-4 rounded bg-blue-500/10 border border-blue-500/20 dark:bg-blue-600/20" />
    </div>
  );
  if (type === 'sidebar') return (
    <div className="flex flex-col gap-2 pt-1 items-center">
      {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded bg-zinc-100 dark:bg-white/5" />)}
      <div className="mt-auto w-6 h-6 rounded bg-zinc-100 dark:bg-white/5" />
    </div>
  );
  if (type === 'hero') return (
    <div className="w-full h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 rounded border border-zinc-100 dark:border-white/5 flex flex-col justify-center p-2 gap-1.5">
        <div className="w-3/4 h-2 rounded bg-zinc-100 dark:bg-white/10" />
        <div className="w-1/2 h-1.5 rounded bg-zinc-50 dark:bg-white/5" />
    </div>
  );
  if (type === 'list') return (
    <div className="flex flex-col gap-1.5 pt-1">
       <div className="w-full h-4 rounded bg-zinc-50 border border-zinc-100 dark:bg-white/5 dark:border-white/5" />
       <div className="w-full h-4 rounded bg-zinc-50 border border-zinc-100 dark:bg-white/5 dark:border-white/5" />
       <div className="w-full h-4 rounded bg-zinc-50 border border-zinc-100 dark:bg-white/5 dark:border-white/5" />
    </div>
  );
  return null;
};

// ==========================================
// 5. 主组件
// ==========================================
export default function V0MiniLoader() {
  const [mode, setMode] = useState<'coding' | 'preview'>('coding');

  useEffect(() => {
    const t = setTimeout(() => setMode('preview'), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleComplete = () => {
    setMode('coding');
    setTimeout(() => {
      setMode('preview');
    }, 2200);
  };

  return (
    <div className="flex items-center justify-center min-h-[300px] bg-zinc-50 dark:bg-neutral-950 p-8 transition-colors duration-500">
      {/* 
         尺寸修改: w-[260px] h-[200px] 
         适配: Light/Dark 边框和背景
      */}
      <div className={cn(
        "relative w-[260px] h-[200px] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans select-none border transition-colors duration-300",
        "bg-white border-zinc-200 ring-1 ring-zinc-200/50", // Light
        "dark:bg-[#0d1117] dark:border-neutral-800 dark:ring-white/5" // Dark
      )}>
        
        {/* Header 也相应变矮 */}
        <div className={cn(
          "h-7 border-b flex items-center px-2.5 gap-1.5 z-30 shrink-0 transition-colors duration-300",
          "bg-zinc-50 border-zinc-100", // Light
          "dark:bg-[#0d1117] dark:border-white/5" // Dark
        )}>
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-[#ff5f56] border border-black/5" />
             <div className="w-2 h-2 rounded-full bg-[#ffbd2e] border border-black/5" />
             <div className="w-2 h-2 rounded-full bg-[#27c93f] border border-black/5" />
          </div>
          <div className="ml-auto flex items-center gap-1 opacity-50">
             <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
             <span className="text-[8px] font-mono text-zinc-400 dark:text-neutral-400">
               {mode === 'preview' ? 'Building...' : 'Generating...'}
             </span>
          </div>
        </div>

        <div className="relative flex-1 w-full overflow-hidden">
          <ScrollingCode />
          <AnimatePresence>
            {mode === 'preview' && (
              <DragSimulator onComplete={handleComplete} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}