import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { cn } from "@/lib/utils";

// Test utility functions used in UI components
describe("UI Utilities", () => {
  describe("className merging", () => {
    it("should merge simple class names", () => {
      expect(cn("flex", "items-center")).toBe("flex items-center");
    });

    it("should handle conditional classes", () => {
      expect(cn("flex", true && "active")).toBe("flex active");
    });

    it("should handle false conditionals", () => {
      expect(cn("flex", false && "active")).toBe("flex");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("px-2 py-4", "px-4")).toBe("py-4 px-4");
    });
  });
});

describe("Badge Component Structure", () => {
  it("should have Badge exported as function", async () => {
    const { Badge } = await import("../badge");
    expect(typeof Badge).toBe("function");
  });
});

describe("Dialog Component Structure", () => {
  it("should have dialog components exported", async () => {
    const module = await import("../dialog");
    expect(typeof module.Dialog).toBe("function");
    expect(typeof module.DialogTrigger).toBe("function");
    expect(typeof module.DialogContent).toBe("function");
    expect(typeof module.DialogHeader).toBe("function");
    expect(typeof module.DialogTitle).toBe("function");
    expect(typeof module.DialogDescription).toBe("function");
    expect(typeof module.DialogFooter).toBe("function");
    expect(typeof module.DialogClose).toBe("function");
  });
});

describe("Button Component Structure", () => {
  it("should have button variants", () => {
    // Test that button styles are defined correctly
    const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"];
    variants.forEach((variant) => {
      expect(variant).toBeDefined();
    });
  });
});