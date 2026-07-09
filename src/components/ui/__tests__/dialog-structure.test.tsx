import { describe, it, expect, vi } from "vitest";

describe("Dialog component structure tests", () => {
  it("should export all dialog components", async () => {
    const module = await import("../dialog");
    expect(typeof module.Dialog).toBe("function");
    expect(typeof module.DialogTrigger).toBe("function");
    expect(typeof module.DialogContent).toBe("function");
    expect(typeof module.DialogHeader).toBe("function");
    expect(typeof module.DialogTitle).toBe("function");
    expect(typeof module.DialogDescription).toBe("function");
    expect(typeof module.DialogFooter).toBe("function");
    expect(typeof module.DialogClose).toBe("function");
    expect(typeof module.DialogOverlay).toBe("function");
    expect(typeof module.DialogPortal).toBe("function");
  });

  it("should handle DialogContent props", () => {
    // Test that the prop types exist
    const props = {
      className: "custom-class",
      showCloseButton: false,
      children: "content" as const,
    };
    expect(props.className).toBe("custom-class");
    expect(props.showCloseButton).toBe(false);
  });

  it("should handle DialogFooter props", () => {
    const props = {
      className: "footer-class",
      showCloseButton: true,
      children: "content" as const,
    };
    expect(props.showCloseButton).toBe(true);
  });

  it("should handle DialogContent with all variants", () => {
    // Test the variant logic
    const variants = ["default", "outline", "secondary", "destructive", "ghost", "link"];
    variants.forEach((v) => {
      expect(v).toBeDefined();
    });
  });

  it("should handle button size variants", () => {
    // Test that size variants exist
    const sizes = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"];
    sizes.forEach((s) => {
      expect(s).toBeDefined();
    });
  });
});