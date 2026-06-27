import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getAIConfigStatus, validateAIConfig } from '../config';

describe('AI Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns correct status when no AI keys are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const status = getAIConfigStatus();
    expect(status.openai).toBe(false);
    expect(status.anthropic).toBe(false);
    expect(status.activeProvider).toBe('keyword-parser');
  });

  it('returns correct status when OpenAI key is set', () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const status = getAIConfigStatus();
    expect(status.openai).toBe(true);
    expect(status.activeProvider).toBe('openai-gpt4');
  });

  it('returns correct status when Anthropic key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.OPENAI_API_KEY;

    const status = getAIConfigStatus();
    expect(status.anthropic).toBe(true);
    expect(status.activeProvider).toBe('claude-sonnet');
  });

  it('prefers OpenAI over Anthropic', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const status = getAIConfigStatus();
    expect(status.activeProvider).toBe('openai-gpt4');
  });

  it('validates config correctly', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = validateAIConfig();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns valid when OpenAI is configured', () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const result = validateAIConfig();
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});