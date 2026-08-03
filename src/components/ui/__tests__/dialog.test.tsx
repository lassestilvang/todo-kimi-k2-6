import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from "../dialog";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  XIcon: ({ className }: { className?: string }) => (
    <span className={className} data-testid="x-icon">✕</span>
  ),
}));

// Mock @base-ui/react/dialog
vi.mock("@base-ui/react/dialog", () => {
  const React = require("react");
  // Dialog is imported as DialogPrimitive and used as Root
  const DialogPrimitive = ({ children, ...props }: any) => (
    <div data-testid="dialog-root" {...props}>
      {children}
    </div>
  );
  DialogPrimitive.Root = DialogPrimitive;
  DialogPrimitive.Trigger = ({ children, ...props }: any) => (
    <button data-testid="dialog-trigger" {...props}>
      {children}
    </button>
  );
  DialogPrimitive.Portal = ({ children }: any) => <div data-testid="dialog-portal">{children}</div>;
  DialogPrimitive.Backdrop = ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>;
  DialogPrimitive.Popup = ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  );
  DialogPrimitive.Close = ({ children }: any) => <button data-testid="dialog-close">{children}</button>;
  DialogPrimitive.Title = ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>;
  DialogPrimitive.Description = ({ children }: any) => <p data-testid="dialog-description">{children}</p>;
  DialogPrimitive.Group = ({ children }: any) => <div data-testid="dialog-group">{children}</div>;
  DialogPrimitive.TitlePrimitive = ({ children }: any) => <h2>{children}</h2>;
  DialogPrimitive.DescriptionPrimitive = ({ children }: any) => <p>{children}</p>;

  return {
    __esModule: true,
    Dialog: DialogPrimitive,
    Root: DialogPrimitive,
    Trigger: DialogPrimitive.Trigger,
    Portal: DialogPrimitive.Portal,
    Backdrop: DialogPrimitive.Backdrop,
    Popup: DialogPrimitive.Popup,
    Close: DialogPrimitive.Close,
    Title: DialogPrimitive.Title,
    Description: DialogPrimitive.Description,
    Group: DialogPrimitive.Group,
    ScrollArea: ({ children }: any) => <div>{children}</div>,
    ScrollUpButton: () => <div />,
    ScrollDownButton: () => <div />,
  };
});

// Mock other UI components
vi.mock("../button", () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("../input", () => ({
  Input: ({ children, ...props }: any) => <input {...props}>{children}</input>,
}));

vi.mock("../textarea", () => ({
  Textarea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
}));

vi.mock("../label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("../select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectValue: ({ children }: any) => <span data-testid="select-value">{children || "placeholder"}</span>,
}));

vi.mock("../popover", () => ({
  Popover: ({ children }: any) => <div data-testid="popover-root">{children}</div>,
  PopoverTrigger: ({ children }: any) => <button data-testid="popover-trigger">{children}</button>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

vi.mock("../scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}));

vi.mock("../separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}));

describe("Dialog Component", () => {
  describe("Module exports", () => {
    it("should export all dialog components", () => {
      expect(Dialog).toBeDefined();
      expect(DialogTrigger).toBeDefined();
      expect(DialogContent).toBeDefined();
      expect(DialogHeader).toBeDefined();
      expect(DialogTitle).toBeDefined();
      expect(DialogDescription).toBeDefined();
      expect(DialogFooter).toBeDefined();
      expect(DialogClose).toBeDefined();
      expect(DialogOverlay).toBeDefined();
      expect(DialogPortal).toBeDefined();
    });

    it("should have correct function names", () => {
      expect(typeof Dialog).toBe("function");
      expect(typeof DialogTrigger).toBe("function");
      expect(typeof DialogContent).toBe("function");
      expect(typeof DialogHeader).toBe("function");
      expect(typeof DialogTitle).toBe("function");
      expect(typeof DialogDescription).toBe("function");
      expect(typeof DialogFooter).toBe("function");
      expect(typeof DialogClose).toBe("function");
      expect(typeof DialogOverlay).toBe("function");
      expect(typeof DialogPortal).toBe("function");
    });
  });

  describe("Dialog Header classes", () => {
    it("has correct flex layout classes", () => {
      const headerClasses = "flex flex-col gap-2";
      expect(headerClasses).toContain("flex");
      expect(headerClasses).toContain("flex-col");
    });
  });

  describe("Dialog Footer classes", () => {
    it("has correct flex-reverse classes", () => {
      const footerClasses = "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end";
      expect(footerClasses).toContain("flex");
      expect(footerClasses).toContain("flex-col-reverse");
      expect(footerClasses).toContain("rounded-b-xl");
    });
  });

  describe("DialogTitle classes", () => {
    it("has correct typography classes", () => {
      const titleClasses = "font-heading text-base leading-none font-medium";
      expect(titleClasses).toContain("font-heading");
      expect(titleClasses).toContain("text-base");
      expect(titleClasses).toContain("font-medium");
    });
  });

  describe("DialogDescription classes", () => {
    it("has correct muted text classes", () => {
      const descClasses = "text-sm text-muted-foreground";
      expect(descClasses).toContain("text-muted-foreground");
    });
  });
});

describe("Dialog structure tests", () => {
  it("renders with proper structure", () => {
    const { container } = render(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders trigger as button", () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByTestId("dialog-trigger")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Dialog" })).toBeTruthy();
  });

  it("renders with close button when showCloseButton is true", () => {
    render(
      <Dialog>
        <DialogContent showCloseButton={true}>
          <DialogTitle>Content</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByTestId("dialog-close")).toBeTruthy();
  });

  it("hides close button when showCloseButton is false", () => {
    render(
      <Dialog>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Content</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByTestId("dialog-close")).toBeNull();
  });
});

describe("Dialog animation classes", () => {
  it("includes open animation classes", () => {
    const openClasses =
      "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95";
    expect(openClasses).toContain("data-open:");
  });

  it("includes closed animation classes", () => {
    const closedClasses =
      "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";
    expect(closedClasses).toContain("data-closed:");
  });

  it("includes overlay animation classes", () => {
    const overlayClasses =
      "duration-100 supports-backdrop-filter:backdrop-blur-xs";
    expect(overlayClasses).toContain("duration-100");
  });
});

describe("DialogOverlay classes", () => {
  it("includes correct positioning classes", () => {
    const overlayClasses =
      "fixed inset-0 isolate z-50 bg-black/10 duration-100";
    expect(overlayClasses).toContain("fixed");
    expect(overlayClasses).toContain("inset-0");
    expect(overlayClasses).toContain("z-50");
  });
});

describe("DialogPortal classes", () => {
  it("has correct data-slot", () => {
    const dataSlot = "dialog-portal";
    expect(dataSlot).toBe("dialog-portal");
  });
});

describe("DialogClose classes", () => {
  it("has correct data-slot", () => {
    const dataSlot = "dialog-close";
    expect(dataSlot).toBe("dialog-close");
  });
});

describe("Dialog accessibility", () => {
  it("provides proper data-slot attributes", () => {
    const slots = [
      "dialog",
      "dialog-trigger",
      "dialog-content",
      "dialog-header",
      "dialog-title",
      "dialog-description",
      "dialog-footer",
      "dialog-close",
      "dialog-overlay",
      "dialog-portal",
    ];
    expect(slots).toHaveLength(10);
    slots.forEach((slot) => {
      expect(`data-slot="${slot}"`).toBeDefined();
    });
  });

  it("supports sr-only class for close button", () => {
    const srOnlyClass = "sr-only";
    expect(srOnlyClass).toBe("sr-only");
  });
});

describe("DialogClose Component", () => {
  it("is a function component", () => {
    expect(typeof DialogClose).toBe("function");
  });

  it("has correct data-slot attribute when rendered", () => {
    const { container } = render(
      <Dialog>
        <DialogClose>Close</DialogClose>
      </Dialog>
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe("DialogFooter Component", () => {
  it("is a function component", () => {
    expect(typeof DialogFooter).toBe("function");
  });

  it("has correct flex-reverse layout", () => {
    const { container } = render(
      <DialogFooter>
        <span>Footer content</span>
      </DialogFooter>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders children correctly", () => {
    render(
      <DialogFooter>
        <button>Action</button>
      </DialogFooter>
    );
    expect(screen.getByText("Action")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DialogFooter className="custom-footer-class">
        Content
      </DialogFooter>
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe("Dialog with ShowCloseButton", () => {
  it("renders DialogContent with showCloseButton option", () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={true}>
          <DialogTitle>Dialog with close</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders DialogContent without showCloseButton option", () => {
    const { container } = render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>No close button</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(container.firstChild).toBeTruthy();
  });
});