"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, Cable, PlugZap, Sparkles } from "lucide-react";
import type { CustomizeSection } from "@/components/customize/types";

export type CustomizeNavItem = {
  id: CustomizeSection;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: CustomizeNavItem[] = [
  {
    id: "skills",
    label: "Skills",
    description: "Domain expertise & procedures",
    icon: Sparkles,
  },
  {
    id: "connectors",
    label: "Connectors",
    description: "Remote MCP servers",
    icon: Cable,
  },
  {
    id: "plugins",
    label: "Plugins",
    description: "Capability surface plans",
    icon: PlugZap,
  },
  {
    id: "subagents",
    label: "Subagents",
    description: "Specialist role routing",
    icon: Bot,
  },
];
