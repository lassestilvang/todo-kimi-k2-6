import { describe, it, expect } from 'bun:test';
import { cn } from '@/lib/utils';

describe('UI Components - Utilities', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      expect(cn("flex", "items-center")).toBe("flex items-center");
    });

    it('should handle conditional classes', () => {
      expect(cn("flex", true && "items-center")).toBe("flex items-center");
    });

    it('should handle false conditionals', () => {
      expect(cn("flex", false && "items-center")).toBe("flex");
    });

    it('should handle arrays of classes', () => {
      expect(cn(["flex", "items-center"])).toBe("flex items-center");
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn("px-2 py-4", "px-4")).toBe("py-4 px-4");
    });

    it('should handle empty input', () => {
      expect(cn()).toBe("");
    });

    it('should handle null and undefined', () => {
      expect(cn("flex", null, undefined, "items-center")).toBe("flex items-center");
    });
  });
});