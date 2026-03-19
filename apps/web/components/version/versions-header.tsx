"use client";

import { motion } from "framer-motion";

export function VersionsHeader() {
  return (
    <header className="mx-auto mb-10 w-full max-w-5xl px-3 text-center md:mb-14 md:px-6 md:text-left">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h1 className="text-4xl font-medium tracking-tight text-zinc-950 dark:text-white md:text-6xl">
          Updates <span className="text-zinc-400 dark:text-zinc-600">&</span> Log
        </h1>
        <p className="mt-4 text-sm font-medium uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
          The evolution of Z0 Agent
        </p>
      </motion.div>
    </header>
  );
}
