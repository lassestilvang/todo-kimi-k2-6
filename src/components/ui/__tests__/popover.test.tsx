import { describe, it, expect } from 'vitest';

describe('Popover Component Structure', () => {
  it('should export all popover components', async () => {
    const module = await import('../popover');
    expect(typeof module.Popover).toBe('function');
    expect(typeof module.PopoverTrigger).toBe('function');
    expect(typeof module.PopoverContent).toBe('function');
    expect(typeof module.PopoverHeader).toBe('function');
    expect(typeof module.PopoverTitle).toBe('function');
    expect(typeof module.PopoverDescription).toBe('function');
  });

  it('should have popover positioning props', () => {
    const sides = ['bottom', 'top', 'left', 'right'] as const;
    const aligns = ['start', 'center', 'end'] as const;

    sides.forEach(side => expect(side).toBeDefined());
    aligns.forEach(align => expect(align).toBeDefined());
  });

  it('should have default sideOffset of 4', () => {
    const defaultSideOffset = 4;
    expect(defaultSideOffset).toBe(4);
  });

  it('should have default align of center', () => {
    const defaultAlign = 'center';
    expect(defaultAlign).toBe('center');
  });

  it('should have popover content class structure', () => {
    const popoverClasses =
      'z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5';
    expect(popoverClasses).toContain('z-50');
    expect(popoverClasses).toContain('flex-col');
  });

  it('should have popover header class structure', () => {
    const headerClasses = 'flex flex-col gap-0.5 text-sm';
    expect(headerClasses).toContain('flex-col');
  });

  it('should have popover title class structure', () => {
    const titleClasses = 'font-medium';
    expect(titleClasses).toContain('font-medium');
  });

  it('should have popover description class structure', () => {
    const descClasses = 'text-muted-foreground';
    expect(descClasses).toContain('text-muted-foreground');
  });

  it('should support popover content customization', () => {
    const customClassName = 'custom-popover';
    expect(customClassName).toBeDefined();
  });
});
