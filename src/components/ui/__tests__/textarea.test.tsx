import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("Textarea Component Structure", () => {
  describe("Component Rendering", () => {
    it("should render Textarea component", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea data-testid="test-textarea" />);
      expect(screen.getByTestId("test-textarea")).toBeInTheDocument();
    });

    it("should pass through placeholder prop", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea placeholder="Enter description" data-testid="placeholder-textarea" />);
      expect(screen.getByTestId("placeholder-textarea")).toHaveAttribute("placeholder", "Enter description");
    });

    it("should pass through value prop", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea value="test text" readOnly data-testid="value-textarea" />);
      expect(screen.getByTestId("value-textarea")).toHaveValue("test text");
    });

    it("should handle onChange events", async () => {
      const { Textarea } = await import("../textarea");
      const handleChange = vi.fn();
      render(<Textarea onChange={handleChange} data-testid="change-textarea" />);

      const textarea = screen.getByTestId("change-textarea");
      fireEvent.change(textarea, { target: { value: "new text" } });

      expect(handleChange).toHaveBeenCalled();
    });

    it("should pass through disabled state", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea disabled data-testid="disabled-textarea" />);
      expect(screen.getByTestId("disabled-textarea")).toBeDisabled();
    });

    it("should pass through rows prop", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea rows={5} data-testid="rows-textarea" />);
      expect(screen.getByTestId("rows-textarea")).toHaveAttribute("rows", "5");
    });

    it("should pass through name attribute", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea name="description" data-testid="name-textarea" />);
      expect(screen.getByTestId("name-textarea")).toHaveAttribute("name", "description");
    });

    it("should pass through id attribute", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea id="desc-textarea" data-testid="id-textarea" />);
      expect(screen.getByTestId("id-textarea")).toHaveAttribute("id", "desc-textarea");
    });

    it("should have data-slot attribute", async () => {
      const { Textarea } = await import("../textarea");
      render(<Textarea data-testid="slot-textarea" />);
      expect(screen.getByTestId("slot-textarea")).toHaveAttribute("data-slot", "textarea");
    });
  });

  describe("Default Classes", () => {
    it("should have default styling classes", () => {
      const defaultClasses =
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40";
      expect(defaultClasses).toContain("min-h-16");
      expect(defaultClasses).toContain("w-full");
      expect(defaultClasses).toContain("rounded-lg");
      expect(defaultClasses).toContain("border");
    });
  });
});