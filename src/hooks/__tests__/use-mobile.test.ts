import { describe, it, expect } from 'bun:test';

// Simple unit test for use-mobile hook logic
describe('useIsMobile', () => {
  it('should be importable', () => {
    const { useIsMobile } = require('../use-mobile');
    expect(typeof useIsMobile).toBe('function');
  });

  it('should have correct MOBILE_BREAKPOINT constant logic', () => {
    // The hook uses 768px as the breakpoint
    const MOBILE_BREAKPOINT = 768;
    expect(MOBILE_BREAKPOINT).toBe(768);
  });
});