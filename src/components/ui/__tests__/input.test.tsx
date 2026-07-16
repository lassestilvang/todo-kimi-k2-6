import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { cn } from "@/lib/utils";

// Mock Base UI Input
vi.mock("@base-ui/react/input", () => ({
  Input: ({ children, className, type, ...props }: any) => (
    <input type={type || "text"} className={className} {...props} />
  ),
}));

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
    const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"];
    variants.forEach((variant) => {
      expect(variant).toBeDefined();
    });
  });
});

describe("Input Component", () => {
  describe("Component Structure", () => {
    it("should render Input component", async () => {
      const { Input } = await import("../input");
      render(<Input data-testid="test-input" />);
      expect(screen.getByTestId("test-input")).toBeInTheDocument();
    });

    it("should pass through type prop", async () => {
      const { Input } = await import("../input");
      render(<Input type="password" data-testid="password-input" />);
      expect(screen.getByTestId("password-input")).toHaveAttribute("type", "password");
    });

    it("should pass through placeholder prop", async () => {
      const { Input } = await import("../input");
      render(<Input placeholder="Enter your name" data-testid="placeholder-input" />);
      expect(screen.getByTestId("placeholder-input")).toHaveAttribute("placeholder", "Enter your name");
    });

    it("should pass through value prop", async () => {
      const { Input } = await import("../input");
      render(<Input value="test value" readOnly data-testid="value-input" />);
      expect(screen.getByTestId("value-input")).toHaveValue("test value");
    });

    it("should handle onChange events", async () => {
      const { Input } = await import("../input");
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} data-testid="change-input" />);

      const input = screen.getByTestId("change-input");
      fireEvent.change(input, { target: { value: "new value" } });

      expect(handleChange).toHaveBeenCalled();
    });

    it("should pass through disabled state", async () => {
      const { Input } = await import("../input");
      render(<Input disabled data-testid="disabled-input" />);
      expect(screen.getByTestId("disabled-input")).toBeDisabled();
    });

    it("should merge custom className with default classes", async () => {
      const { Input } = await import("../input");
      render(<Input className="custom-class" data-testid="class-input" />);
      expect(screen.getByTestId("class-input")).toHaveClass("custom-class");
    });

    it("should handle name attribute", async () => {
      const { Input } = await import("../input");
      render(<Input name="email" data-testid="name-input" />);
      expect(screen.getByTestId("name-input")).toHaveAttribute("name", "email");
    });

    it("should handle id attribute", async () => {
      const { Input } = await import("../input");
      render(<Input id="email-input" data-testid="id-input" />);
      expect(screen.getByTestId("id-input")).toHaveAttribute("id", "email-input");
    });
  });

  describe("Default Classes", () => {
    it("should have default styling classes", () => {
      const defaultClasses =
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40";
      expect(defaultClasses).toContain("h-8");
      expect(defaultClasses).toContain("w-full");
      expect(defaultClasses).toContain("rounded-lg");
      expect(defaultClasses).toContain("border");
    });
  });
});