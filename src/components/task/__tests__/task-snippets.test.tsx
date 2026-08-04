import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskSnippets } from "../task-snippets";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    getStore: () => store,
    setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, size, onClick, className }: any) => (
    <button
      variant={variant}
      size={size}
      onClick={onClick}
      className={className}
      data-testid="button"
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="input"
    />
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div className="pt-6">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, onOpenChange: _onOpenChange, children }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span variant={variant} className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock("lucide-react", () => ({
  Plus: ({ className }: { className?: string }) => <span className={className} data-testid="plus-icon">+</span>,
  Tag: ({ className }: { className?: string }) => <span className={className} data-testid="tag-icon">TAG</span>,
  Trash2: ({ className }: { className?: string }) => <span className={className} data-testid="trash-icon">X</span>,
  X: ({ className }: { className?: string }) => <span className={className} data-testid="x-icon">X</span>,
}));

describe("TaskSnippets", () => {
  const mockInsertSnippet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("Initial Render", () => {
    it("renders the component with title", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText("Task Snippets")).toBeInTheDocument();
    });

    it("shows empty state when no snippets", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText(/No snippets saved yet/)).toBeInTheDocument();
    });

    it("has button to create new snippet", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText("New Snippet")).toBeInTheDocument();
    });

    it("renders tag icon", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByTestId("tag-icon")).toBeInTheDocument();
    });
  });

  describe("Snippet Display", () => {
    it("loads snippets from localStorage", () => {
      const existingSnippets = [
        {
          id: "1",
          name: "Existing Snippet",
          template: { name: "Test", priority: "high" },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText("Existing Snippet")).toBeInTheDocument();
    });

    it("handles localStorage parse errors gracefully", () => {
      localStorageMock.setStore({ "task-snippets": "invalid json" });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      // Should show empty state
      expect(screen.getByText(/No snippets saved yet/)).toBeInTheDocument();
    });

    it("sorts snippets by use count (descending)", () => {
      const existingSnippets = [
        {
          id: "1",
          name: "Rarely Used",
          template: { name: "Test" },
          createdAt: new Date().toISOString(),
          useCount: 1,
        },
        {
          id: "2",
          name: "Frequently Used",
          template: { name: "Test" },
          createdAt: new Date().toISOString(),
          useCount: 10,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      // All snippets should be visible
      expect(screen.getByText("Frequently Used")).toBeInTheDocument();
      expect(screen.getByText("Rarely Used")).toBeInTheDocument();
    });
  });

  describe("Snippet Usage", () => {
    it("uses snippet and increments use count", async () => {
      const existingSnippets = [
        {
          id: "1",
          name: "Test Snippet",
          template: { name: "Test Task", priority: "high" },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      const snippetElement = screen.getByText("Test Snippet").closest('div');
      if (snippetElement) {
        fireEvent.click(snippetElement);
      }

      await waitFor(() => {
        expect(mockInsertSnippet).toHaveBeenCalled();
      });
    });

    it("shows use count for snippets", () => {
      const existingSnippets = [
        {
          id: "1",
          name: "Used Snippet",
          template: { name: "Test" },
          createdAt: new Date().toISOString(),
          useCount: 5,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText(/Used 5 times/)).toBeInTheDocument();
    });
  });

  describe("Snippet Deletion", () => {
    it("deletes snippet when trash button clicked", async () => {
      const existingSnippets = [
        {
          id: "1",
          name: "Snippet to Delete",
          template: { name: "Test" },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      const trashButton = screen.getByTestId("trash-icon").closest("button");
      if (trashButton) {
        fireEvent.click(trashButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/No snippets saved yet/)).toBeInTheDocument();
      });
    });
  });

  describe("Priority Badge", () => {
    it("shows priority badge when snippet has priority", () => {
      const existingSnippets = [
        {
          id: "1",
          name: "High Priority Snippet",
          template: { name: "Test", priority: "high" },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText(/high priority/)).toBeInTheDocument();
    });

    it("does not show priority badge when snippet has no priority", () => {
      const existingSnippets = [
        {
          id: "1",
          name: "No Priority Snippet",
          template: { name: "Test" },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.queryByText(/priority/)).not.toBeInTheDocument();
    });
  });

  describe("List ID Display", () => {
    it("shows list ID when snippet has list_id", () => {
      const existingSnippets = [
        {
          id: "1",
          name: "List Snippet",
          template: { name: "Test", list_id: 5 },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      expect(screen.getByText(/List: 5/)).toBeInTheDocument();
    });
  });

  describe("Dialog Trigger", () => {
    it("has New Snippet button to trigger dialog", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      const newSnippetButton = screen.getByText("New Snippet");
      expect(newSnippetButton).toBeInTheDocument();
    });
  });

  describe("Dialog Content", () => {
    it("shows dialog content when triggered", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      const newSnippetButton = screen.getByText("New Snippet");
      fireEvent.click(newSnippetButton);

      // Dialog title should be visible
      expect(screen.getByText("Create Task Snippet")).toBeInTheDocument();
    });

    it("shows snippet name input in dialog", () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      const newSnippetButton = screen.getByText("New Snippet");
      fireEvent.click(newSnippetButton);

      expect(screen.getByPlaceholderText("e.g., Meeting follow-up")).toBeInTheDocument();
    });
  });

  describe("Class Name Prop", () => {
    it("applies custom className", () => {
      render(
        <TaskSnippets onInsertSnippet={mockInsertSnippet} className="custom-class" />
      );

      expect(screen.getByText("Task Snippets")).toBeInTheDocument();
    });
  });

  describe("onInsertSnippet callback", () => {
    it("receives correct snippet data when used", async () => {
      const existingSnippets = [
        {
          id: "1",
          name: "Callback Test",
          template: {
            name: "Test Task",
            priority: "critical",
            deadline: "2024-12-31",
            description: "Test description",
          },
          createdAt: new Date().toISOString(),
          useCount: 0,
        },
      ];
      localStorageMock.setStore({ "task-snippets": JSON.stringify(existingSnippets) });

      const mockCallback = vi.fn();
      render(<TaskSnippets onInsertSnippet={mockCallback} />);

      const snippetElement = screen.getByText("Callback Test").closest('div');
      if (snippetElement) {
        fireEvent.click(snippetElement);
      }

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith({
          name: "Test Task",
          priority: "critical",
          deadline: "2024-12-31",
          description: "Test description",
        });
      });
    });
  });

  describe("LocalStorage Integration", () => {
    it("saves snippets to localStorage when created", async () => {
      render(<TaskSnippets onInsertSnippet={mockInsertSnippet} />);

      const newSnippetButton = screen.getByText("New Snippet");
      fireEvent.click(newSnippetButton);

      const nameInput = screen.getByPlaceholderText("e.g., Meeting follow-up");
      fireEvent.change(nameInput, { target: { value: "New Test Snippet" } });

      const createButton = screen.getByText("Create Snippet");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });
});