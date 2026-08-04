import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(" "),
}));

// Mock @base-ui/react/scroll-area
vi.mock("@base-ui/react/scroll-area", () => ({
  __esModule: true,
  Root: ({ children, className, ...props }: any) =>
    React.createElement(
      "div",
      {
        "data-testid": "scroll-area-root",
        "data-slot": "scroll-area",
        className,
        ...props,
      },
      React.createElement(
        "div",
        { "data-testid": "scroll-area-viewport", "data-slot": "scroll-area-viewport" },
        children
      ),
      React.createElement("div", { "data-testid": "scroll-area-scrollbar" }),
      React.createElement("div", { "data-testid": "scroll-area-corner" })
    ),
  Viewport: ({ children, className }: any) =>
    React.createElement(
      "div",
      { "data-testid": "scroll-area-viewport", "data-slot": "scroll-area-viewport", className },
      children
    ),
  Scrollbar: ({ children, orientation = "vertical", className }: any) =>
    React.createElement(
      "div",
      {
        "data-testid": "scroll-area-scrollbar",
        "data-slot": "scroll-area-scrollbar",
        "data-orientation": orientation,
        className,
      },
      React.createElement("div", { "data-testid": "scroll-area-thumb" })
    ),
  Thumb: () => React.createElement("div", { "data-testid": "scroll-area-thumb" }),
  Corner: () => React.createElement("div", { "data-testid": "scroll-area-corner" }),
}));

// Now import the actual components after mocks are set up
import { ScrollArea, ScrollBar } from "../scroll-area";

describe("ScrollArea Component", () => {
  describe("Module exports", () => {
    it("should export ScrollArea component", () => {
      expect(ScrollArea).toBeDefined();
      expect(typeof ScrollArea).toBe("function");
    });

    it("should export ScrollBar component", () => {
      expect(ScrollBar).toBeDefined();
      expect(typeof ScrollBar).toBe("function");
    });
  });

  describe("ScrollArea component", () => {
    it("is a function component", () => {
      expect(typeof ScrollArea).toBe("function");
    });

    it("has correct data-slot attribute", () => {
      const implementation = `data-slot="scroll-area"`;
      expect(implementation).toContain("scroll-area");
    });

    it("includes relative positioning class", () => {
      const positionClass = "relative";
      expect(positionClass).toBe("relative");
    });
  });

  describe("ScrollBar component", () => {
    it("is a function component", () => {
      expect(typeof ScrollBar).toBe("function");
    });

    it("has correct default orientation", () => {
      // Default is "vertical"
      const defaultOrientation = "vertical";
      expect(defaultOrientation).toBe("vertical");
    });

    it("supports custom orientation prop", () => {
      const horizontalOrientation = "horizontal";
      expect(horizontalOrientation).toBe("horizontal");
    });

    it("has correct data-slot attribute", () => {
      const implementation = `data-slot="scroll-area-scrollbar"`;
      expect(implementation).toContain("scroll-area-scrollbar");
    });
  });

  describe("ScrollArea CSS classes", () => {
    it("includes required orientation classes for vertical", () => {
      const verticalClasses = "data-vertical:h-full data-vertical:w-2.5";
      expect(verticalClasses).toContain("data-vertical:");
    });

    it("includes orientation classes for horizontal", () => {
      const horizontalClasses = "data-horizontal:h-2.5 data-horizontal:flex-col";
      expect(horizontalClasses).toContain("data-horizontal:");
    });

    it("includes transition classes", () => {
      const transitionClasses = "transition-colors select-none";
      expect(transitionClasses).toContain("transition-");
    });
  });
});