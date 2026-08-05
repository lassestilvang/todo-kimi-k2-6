"use client";

import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Zap, Brain, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AIStatusIndicatorProps {
  aiProvider?: string;
  confidenceScore?: number;
  className?: string;
}

const aiProviderConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  "openai-gpt4": {
    label: "GPT-4",
    icon: Sparkles,
    color: "bg-gradient-to-r from-green-500 to-emerald-500",
    description: "Parsed with OpenAI GPT-4",
  },
  "claude-sonnet": {
    label: "Claude",
    icon: Brain,
    color: "bg-gradient-to-r from-purple-500 to-violet-500",
    description: "Parsed with Claude Sonnet",
  },
  "keyword-parser": {
    label: "Keyword",
    icon: Database,
    color: "bg-gray-500",
    description: "Parsed with keyword detection",
  },
};

export function AIStatusIndicator({ aiProvider = "keyword-parser", confidenceScore = 0.5, className }: AIStatusIndicatorProps) {
  const config = aiProviderConfig[aiProvider] || aiProviderConfig["keyword-parser"];
  const Icon = config.icon;

  // Only show indicator if confidence is meaningful or it's an AI provider
  const shouldShow = confidenceScore > 0.5 || !aiProviderConfig[aiProvider]?.description?.includes("keyword");

  if (!shouldShow) return null;

  const confidencePercent = Math.round(confidenceScore * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={cn("inline-flex items-center gap-1", className)}>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-1.5 transition-all hover:shadow-sm",
                config.color.replace("bg-", "bg-opacity-10"),
                `hover:${config.color.replace("bg-", "bg-opacity-20")}`
              )}
            >
              <Icon className="h-2.5 w-2.5 mr-0.5" />
              {config.label}
            </Badge>

            {confidenceScore < 0.7 && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200"
              >
                {confidencePercent}%
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.label} Parsing</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <div className="text-xs">Confidence: {confidencePercent}%</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AIPreviewIndicator({ aiProvider = "keyword-parser", confidenceScore = 0.5 }: { aiProvider?: string; confidenceScore?: number }) {
  const config = aiProviderConfig[aiProvider] || aiProviderConfig["keyword-parser"];
  const Icon = config.icon;
  const confidencePercent = Math.round(confidenceScore * 100);

  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 opacity-60" />
      <span className="text-xs text-muted-foreground">
        {config.label} ({confidencePercent}%)
      </span>
    </div>
  );
}

// Provider logos for comparison view
export const PROVIDER_LOGOS = {
  "openai-gpt4": "🏢",
  "claude-sonnet": "🤖",
  "keyword-parser": "🔍",
};

export function ProviderBadge({ provider }: { provider: string }) {
  const logo = PROVIDER_LOGOS[provider as keyof typeof PROVIDER_LOGOS] || "📝";
  const label = provider === "openai-gpt4" ? "GPT-4" :
                provider === "claude-sonnet" ? "Claude" :
                "Keyword";

  return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] rounded bg-muted">
      {logo}
      {label}
    </span>
  );
}