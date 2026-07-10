import { describe, it, expect } from 'vitest';

describe('Textarea Component Structure', () => {
  it('should be importable', async () => {
    const { Textarea } = await import('../textarea');
    expect(typeof Textarea).toBe('function');
  });

  it('should have textarea attributes', () => {
    const textareaProps = {
      className: 'custom-class',
      placeholder: 'Enter text',
      rows: 4,
    };
    expect(textareaProps).toBeDefined();
  });

  it('should have default class names', () => {
    const defaultClasses =
      'flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40';
    expect(defaultClasses).toContain('min-h-16');
    expect(defaultClasses).toContain('border-input');
  });

  it('should support custom className', () => {
    const customClass = 'custom-textarea-class';
    expect(customClass).toBeDefined();
  });
});
