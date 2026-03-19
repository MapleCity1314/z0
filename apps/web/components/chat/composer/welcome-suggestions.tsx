"use client";

import { type ChatStatus, type FileUIPart } from "ai";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Lightbulb,
  PenSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { usePromptInputController } from "@/components/ai-elements/prompt-input";

type WelcomeSuggestionCategory =
  | "code"
  | "finance"
  | "learning"
  | "writing"
  | "life"
  | "ideas";

type WelcomePromptTemplate = {
  summary: string;
  prompt: string;
};

const CATEGORY_ICONS: Record<WelcomeSuggestionCategory, typeof Code2> = {
  code: Code2,
  finance: Landmark,
  learning: GraduationCap,
  writing: PenSquare,
  life: Heart,
  ideas: Lightbulb,
};

const WELCOME_SUGGESTIONS: {
  key: WelcomeSuggestionCategory;
  label: string;
  prompts: WelcomePromptTemplate[];
}[] = [
  {
    key: "code",
    label: "Code",
    prompts: [
      {
        summary: "Review my code and improve it",
        prompt:
          "Hi z0! Could you look over my code and give me practical improvement tips? If you need more information, ask me 1-2 key questions right away. Please highlight bugs, architecture issues, readability concerns, and performance risks in priority order. Then give me a concrete fix plan with quick wins first. If useful, create a checklist we can go through together. Use any tools you have access to, like web search, if they help.",
      },
      {
        summary: "Debug this error fast",
        prompt:
          "I need help debugging an issue quickly. Please identify likely root causes, propose the fastest safe fix, and tell me exactly what to check first. If details are missing, ask me only the most critical 1-2 questions. Then provide a step-by-step diagnostic flow I can run immediately.",
      },
      {
        summary: "Refactor for clarity and speed",
        prompt:
          "Please refactor this code for clarity, maintainability, and performance. Show the improved version and explain the main tradeoffs. If there are multiple options, compare them and recommend one default path. Include any risks of regression and what tests I should run.",
      },
      {
        summary: "Design a clean architecture",
        prompt:
          "Help me redesign this feature architecture. I want clear boundaries, good naming, and a structure that scales. Please propose 2 architecture options with pros and cons, pick one, and provide an implementation plan with milestones.",
      },
      {
        summary: "Write tests for this module",
        prompt:
          "Please create a focused test strategy for this module. Prioritize high-risk paths first, then add edge cases. Provide sample test cases, expected outcomes, and a minimal test suite order I can run to gain confidence quickly.",
      },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    prompts: [
      {
        summary: "Analyze this money decision",
        prompt:
          "Help me evaluate this financial decision clearly. State assumptions, upside, downside, and hidden risks. Then give me a simple decision framework and a practical next-step plan. If anything is missing, ask me only the most important 1-2 questions first.",
      },
      {
        summary: "Compare two investments",
        prompt:
          "Please compare these investment options in plain English: expected return, volatility, liquidity, fees, and downside scenarios. End with a recommendation for conservative, balanced, and aggressive profiles so I can choose quickly.",
      },
      {
        summary: "Build my monthly budget",
        prompt:
          "Create a realistic monthly budget plan for me with fixed costs, variable costs, savings targets, and a buffer. Include a lightweight tracking method I can actually stick to and a weekly check-in checklist.",
      },
      {
        summary: "Debt payoff strategy",
        prompt:
          "Design a debt payoff strategy for me. Compare avalanche vs snowball for my case, estimate timeline, and show how much interest I can save. Give me a month-by-month action plan.",
      },
      {
        summary: "Emergency fund roadmap",
        prompt:
          "Help me build an emergency fund roadmap from scratch. Recommend target amount, contribution pace, account type, and what to prioritize if my cash flow is tight.",
      },
    ],
  },
  {
    key: "learning",
    label: "Learning",
    prompts: [
      {
        summary: "Teach me from zero to usable",
        prompt:
          "Teach me this topic from first principles to practical usage. Keep it structured and concise. Build a short learning roadmap with checkpoints, common mistakes, and one practical exercise after each section.",
      },
      {
        summary: "Adaptive quiz mode",
        prompt:
          "Quiz me on this topic and adapt difficulty based on my answers. After each response, tell me exactly what I got right or wrong and what concept I should review next.",
      },
      {
        summary: "7-day study sprint",
        prompt:
          "Turn this material into a 7-day study sprint with daily goals, estimated time, and concrete exercises. Keep each day practical and measurable.",
      },
      {
        summary: "Explain like mentor",
        prompt:
          "Explain this concept like a patient mentor. Use simple examples first, then level up to advanced cases. End with a quick self-test and answer key.",
      },
      {
        summary: "Make a revision sheet",
        prompt:
          "Create a concise revision sheet for this topic with key ideas, formulas or rules, memory hooks, and a last-minute review checklist.",
      },
    ],
  },
  {
    key: "writing",
    label: "Writing",
    prompts: [
      {
        summary: "Rewrite with my tone",
        prompt:
          "Rewrite this message to be clearer, tighter, and more professional while preserving my tone and intent. Show one polished version plus two alternatives with different levels of formality.",
      },
      {
        summary: "Draft + 2 stronger options",
        prompt:
          "Help me draft a strong first version of this writing task, then provide two sharper alternatives. Explain when each version should be used.",
      },
      {
        summary: "Deep edit for impact",
        prompt:
          "Edit this text for structure, flow, and persuasive impact. Point out weak lines, suggest stronger replacements, and provide a revised final version.",
      },
      {
        summary: "Shorten without losing meaning",
        prompt:
          "Compress this text to be much shorter without losing key meaning. Keep the message accurate, smooth, and direct.",
      },
      {
        summary: "Write for busy readers",
        prompt:
          "Rewrite this for busy readers: lead with the key point, make scanning easy, and end with a clear call to action.",
      },
    ],
  },
  {
    key: "life",
    label: "Life",
    prompts: [
      {
        summary: "Plan my week realistically",
        prompt:
          "Help me build a realistic weekly plan. Prioritize what matters, keep workload sustainable, and include recovery time. Give me a simple daily structure and fallback plan if I slip.",
      },
      {
        summary: "Help me choose wisely",
        prompt:
          "I am stuck on a personal decision. Ask me the most important 1-2 questions first, then help me decide using a clear framework with pros, cons, and likely outcomes.",
      },
      {
        summary: "Build a routine that sticks",
        prompt:
          "Design a practical routine I can stick to with low friction. Keep it simple, flexible, and measurable. Include trigger habits and a short weekly review.",
      },
      {
        summary: "Reduce stress plan",
        prompt:
          "Create a practical stress-reduction plan for my current situation. Focus on actions I can do today, this week, and this month.",
      },
      {
        summary: "Fix procrastination loop",
        prompt:
          "Help me break my procrastination loop. Diagnose likely causes, suggest quick interventions, and give me a focused action plan for the next 48 hours.",
      },
    ],
  },
  {
    key: "ideas",
    label: "Ideas",
    prompts: [
      {
        summary: "10 bold ideas, ranked",
        prompt:
          "Brainstorm 10 bold ideas for this problem and rank them by impact, feasibility, and speed to first result. Include one safe bet, one balanced option, and one high-risk high-reward pick.",
      },
      {
        summary: "Creative angles with tradeoffs",
        prompt:
          "Give me multiple creative angles for this concept. For each angle, provide quick pros, cons, and what would make it succeed or fail.",
      },
      {
        summary: "From rough thought to plan",
        prompt:
          "Turn this rough idea into a concrete project plan with clear scope, milestones, and a first-week execution checklist.",
      },
      {
        summary: "Challenge my assumptions",
        prompt:
          "Stress-test this idea. Challenge weak assumptions, identify blind spots, and suggest stronger alternatives with reasoning.",
      },
      {
        summary: "Pick one idea to execute now",
        prompt:
          "Help me choose one idea to execute this week. Compare top candidates, recommend one, and give me a day-by-day launch plan.",
      },
    ],
  },
];

export function WelcomeSuggestions({
  showWelcome,
  status,
  onSubmit,
  onGhostVisibleChange,
}: {
  showWelcome: boolean;
  status: ChatStatus;
  onSubmit: (message: { text: string; files: FileUIPart[] }) => void;
  onGhostVisibleChange: (visible: boolean) => void;
}) {
  const controller = usePromptInputController();
  const [activeCategory, setActiveCategory] =
    useState<WelcomeSuggestionCategory | null>(null);
  const [ghostText, setGhostText] = useState("");

  if (!showWelcome) {
    return null;
  }

  const isInputEmpty = controller.textInput.value.trim().length === 0;
  const shouldShowGhost = isInputEmpty && ghostText.length > 0;
  const activeConfig = WELCOME_SUGGESTIONS.find(
    (item) => item.key === activeCategory,
  );

  const handleSendPrompt = (prompt: string) => {
    setGhostText("");
    setActiveCategory(null);
    controller.textInput.clear();
    onSubmit({ text: prompt, files: [] });
  };

  useEffect(() => {
    onGhostVisibleChange(shouldShowGhost);
    return () => onGhostVisibleChange(false);
  }, [onGhostVisibleChange, shouldShowGhost]);

  return (
    <div className="pointer-events-none absolute left-0 right-0 bottom-full mb-2 md:static md:mt-3 md:mb-0 md:pointer-events-auto">
      <div className="pointer-events-none absolute top-2 left-6 right-6 z-10 hidden md:block">
        <div
          className={cn(
            "relative h-10 overflow-hidden transition-opacity duration-150",
            shouldShowGhost ? "opacity-100" : "opacity-0",
          )}
        >
          <p className="h-10 leading-10 text-sm text-zinc-400 dark:text-zinc-500 whitespace-nowrap pr-14">
            {ghostText}
          </p>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent dark:from-zinc-900" />
        </div>
      </div>

      <div className="relative md:h-[220px]">
        <div
          className={cn(
            "pointer-events-auto transition-opacity duration-150 md:absolute md:inset-0",
            activeConfig ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <Suggestions className="h-full justify-center gap-3 px-1">
            {WELCOME_SUGGESTIONS.map((item) => (
              <Suggestion
                key={item.key}
                suggestion={item.label}
                className="h-7"
                onClick={() => setActiveCategory(item.key)}
                disabled={status === "submitted" || status === "streaming"}
              >
                <span className="inline-flex items-center gap-1.5">
                  {(() => {
                    const Icon = CATEGORY_ICONS[item.key];
                    return <Icon className="size-3.5" />;
                  })()}
                  <span>{item.label}</span>
                </span>
              </Suggestion>
            ))}
          </Suggestions>
        </div>

        <div
          className={cn(
            "pointer-events-auto absolute left-0 right-0 bottom-full mb-2 max-h-[50vh] rounded-2xl border border-zinc-200/90 bg-white/95 p-2.5 shadow-sm transition-opacity duration-150 dark:border-zinc-800 dark:bg-zinc-900/95 md:inset-x-0 md:top-0 md:bottom-0 md:mb-0 md:max-h-none",
            activeConfig ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onMouseLeave={() => setGhostText("")}
        >
          <div className="mb-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => {
                setActiveCategory(null);
                setGhostText("");
              }}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">
              {activeConfig?.label}
            </span>
          </div>

          <div className="h-[176px] overflow-auto pr-1">
            <div className="space-y-1">
              {activeConfig?.prompts.map((item) => (
                <SuggestionPromptItem
                  key={item.summary}
                  category={activeConfig.key}
                  summary={item.summary}
                  prompt={item.prompt}
                  onHoverChange={setGhostText}
                  onSelect={handleSendPrompt}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionPromptItem({
  category,
  summary,
  prompt,
  onHoverChange,
  onSelect,
}: {
  category: WelcomeSuggestionCategory;
  summary: string;
  prompt: string;
  onHoverChange: (text: string) => void;
  onSelect: (prompt: string) => void;
}) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <button
      type="button"
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      onMouseEnter={() => onHoverChange(prompt)}
      onFocus={() => onHoverChange(prompt)}
      onMouseLeave={() => onHoverChange("")}
      onBlur={() => onHoverChange("")}
      onClick={() => onSelect(prompt)}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        <span className="line-clamp-1 flex-1">{summary}</span>
        <ArrowRight className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
      </span>
    </button>
  );
}
