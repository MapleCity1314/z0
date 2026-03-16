"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { clsx } from 'clsx';

// ==========================================
// 1. 迷你版无限滚动代码
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
    <div className="absolute inset-0 overflow-hidden bg-[#0d1117] flex flex-col pt-3 opacity-90 select-none">
      <div className="absolute top-0 left-0 right-0 h-8 bg-linear-to-b from-[#0d1117] to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-[#0d1117] to-transparent z-10" />

      <motion.div
        className="flex flex-col gap-2"
        animate={{ y: [0, -310] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 8,
        }}
      >
        {[...codeLines, ...codeLines, ...codeLines].map((line, i) => (
          <div key={i} className="flex items-center w-full pl-3 h-2.5">
             <div className="w-4 text-slate-700 text-[8px] text-right mr-2 font-mono">{i % 15 + 1}</div>
             <div className="flex h-full mr-1">
                {Array.from({ length: line.indent }).map((_, j) => (
                  <div key={j} className="w-3 border-r border-white/5 h-full mr-0.5" />
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
// 2. 布局定义
// ==========================================
const MINI_LAYOUT = [
  { id: 'nav', type: 'nav', x: 0, y: 0, w: 260, h: 32 },
  { id: 'sidebar', type: 'sidebar', x: 0, y: 40, w: 50, h: 160 },
  { id: 'hero', type: 'hero', x: 60, y: 40, w: 190, h: 70 },
  { id: 'list', type: 'list', x: 60, y: 120, w: 190, h: 80 },
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

        setPhase('moving_to_start');
        setCursorPos({ x: item.x, y: item.y });
        await wait(400); 

        setPhase('dragging');
        setCursorPos({ x: item.x + item.w, y: item.y + item.h });
        
        const dragDuration = item.w > 100 ? 700 : 500; 
        await wait(dragDuration);

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
      className="absolute inset-0 bg-neutral-900 border-l border-white/10 z-20 overflow-hidden shadow-[-10px_0px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
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
                ? "border border-white/10 bg-[#161b22]" 
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
        <MousePointer2 
          size={16} 
          className={clsx(
            "drop-shadow-lg transition-colors duration-200",
            phase === 'dragging' ? "text-blue-500 fill-blue-500/20" : "text-white fill-black/40"
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
      <div className="w-4 h-4 rounded-full bg-white/10" />
      <div className="w-12 h-1.5 rounded bg-white/10" />
      <div className="ml-auto w-8 h-4 rounded bg-blue-600/20 border border-blue-500/20" />
    </div>
  );
  if (type === 'sidebar') return (
    <div className="flex flex-col gap-2 pt-1 items-center">
      {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded bg-white/5" />)}
      <div className="mt-auto w-6 h-6 rounded bg-white/5" />
    </div>
  );
  if (type === 'hero') return (
    <div className="w-full h-full bg-linear-to-br from-indigo-500/10 to-purple-500/10 rounded border border-white/5 flex flex-col justify-center p-2 gap-1.5">
        <div className="w-3/4 h-2 rounded bg-white/10" />
        <div className="w-1/2 h-1.5 rounded bg-white/5" />
    </div>
  );
  if (type === 'list') return (
    <div className="flex flex-col gap-1.5 pt-1">
       <div className="w-full h-4 rounded bg-white/5 border border-white/5" />
       <div className="w-full h-4 rounded bg-white/5 border border-white/5" />
       <div className="w-full h-4 rounded bg-white/5 border border-white/5" />
    </div>
  );
  return null;
};

// ==========================================
// 5. 主组件 - 右下角固定位置
// ==========================================
export function ProjectLoading() {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="relative w-[260px] h-[200px] bg-[#0d1117] rounded-lg border border-neutral-800 shadow-2xl overflow-hidden flex flex-col font-sans select-none ring-1 ring-white/5">
        
        <div className="h-7 border-b border-white/5 bg-[#0d1117] flex items-center px-2.5 gap-1.5 z-30 shrink-0">
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-[#ff5f56]" />
             <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
             <div className="w-2 h-2 rounded-full bg-[#27c93f]" />
          </div>
          <div className="ml-auto flex items-center gap-1 opacity-50">
             <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
             <span className="text-[8px] text-neutral-400 font-mono">
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
    </motion.div>
  );
}
