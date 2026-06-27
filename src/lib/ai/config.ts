/**
 * AI Configuration validation and status
 */

export interface AIConfigStatus {
  openai: boolean;
  anthropic: boolean;
  activeProvider: string;
}

export function getAIConfigStatus(): AIConfigStatus {
  const openai = !!process.env.OPENAI_API_KEY;
  const anthropic = !!process.env.ANTHROPIC_API_KEY;

  let activeProvider = "keyword-parser";
  if (openai) activeProvider = "openai-gpt4";
  else if (anthropic) activeProvider = "claude-sonnet";

  return {
    openai,
    anthropic,
    activeProvider,
  };
}

export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const status = getAIConfigStatus();

  if (!status.openai && !status.anthropic) {
    errors.push("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}