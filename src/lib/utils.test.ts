import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("flex", "items-center")).toBe("flex items-center");
    });

    it("should handle conditional classes", () => {
      expect(cn("flex", true && "items-center")).toBe("flex items-center");
    });

    it("should handle false conditionals", () => {
      expect(cn("flex", false && "items-center")).toBe("flex");
    });

    it("should handle arrays of classes", () => {
      expect(cn(["flex", "items-center"])).toBe("flex items-center");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("px-2 py-4", "px-4")).toBe("py-4 px-4");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle null and undefined", () => {
      expect(cn("flex", null, undefined, "items-center")).toBe("flex items-center");
    });

    it("should handle multiple null and undefined values", () => {
      expect(cn("flex", null, undefined, null, "items-center", undefined)).toBe("flex items-center");
    });

    it("should handle conflicting classes", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("should handle complex tailwind merge", () => {
      expect(cn("bg-black text-white", "bg-white text-black")).toBe("bg-white text-black");
    });

    it("should handle nested arrays", () => {
      expect(cn(["flex", ["items-center", "justify-center"]])).toBe("flex items-center justify-center");
    });
  });
});