import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskSnippets } from "../task-snippets";

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("TaskSnippets", () => {
  beforeEach(() => {
    // Reset localStorage mock
    const store: Record<string, string> = {};
    localStorageMock.getItem = (key: string) => store[key] || null;
    localStorageMock.setItem = (key: string, value: string) => {
      store[key] = value;
    };
  });

  it("renders the component", () => {
    const mockInsert = () => {};
    render(<TaskSnippets onInsertSnippet={mockInsert} />);

    expect(screen.getByText("Task Snippets")).toBeInTheDocument();
  });

  it("shows empty state when no snippets", () => {
    const mockInsert = () => {};
    render(<TaskSnippets onInsertSnippet={mockInsert} />);

    expect(screen.getByText(/No snippets saved yet/)).toBeInTheDocument();
  });

  it("has button to create new snippet", () => {
    const mockInsert = () => {};
    render(<TaskSnippets onInsertSnippet={mockInsert} />);

    expect(screen.getByText("New Snippet")).toBeInTheDocument();
  });
});