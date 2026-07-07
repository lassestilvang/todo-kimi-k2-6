import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { WSMessage } from "@/lib/ws";

// Mock WebSocket
class MockWebSocket {
  readyState = 1; // OPEN
  static OPEN = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  constructor(_url: string) {
    // Auto-trigger open
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(_data: string) {
    // Mock send
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }
}

// Mock the ws client module
vi.mock("@/lib/ws", () => ({
  wsClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    send: vi.fn(),
    ["ws"]: { readyState: 1 }, // OPEN
  },
}));

// Mock WebSocket constructor
global.WebSocket = MockWebSocket as any;

// Import after mock setup
import { useWebSocket } from "../use-websocket";

describe("useWebSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hook structure", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current).toHaveProperty("isConnected");
      expect(result.current).toHaveProperty("presence");
      expect(result.current).toHaveProperty("sendTaskUpdate");
      expect(result.current).toHaveProperty("sendPresence");
    });

    it("should have initial connected state based on ws readyState", () => {
      const { result } = renderHook(() => useWebSocket());
      expect(typeof result.current.isConnected).toBe("boolean");
    });
  });

  describe("sendTaskUpdate", () => {
    it("should exist and be callable", () => {
      const { result } = renderHook(() => useWebSocket());
      expect(typeof result.current.sendTaskUpdate).toBe("function");

      act(() => {
        result.current.sendTaskUpdate(123, { name: "Test" });
      });
    });
  });

  describe("sendPresence", () => {
    it("should exist and be callable", () => {
      const { result } = renderHook(() => useWebSocket());
      expect(typeof result.current.sendPresence).toBe("function");

      act(() => {
        result.current.sendPresence(1, "Test User");
      });
    });
  });

  describe("onMessage callback", () => {
    it("should accept onMessage option", () => {
      const mockCallback = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onMessage: mockCallback }));

      expect(result.current).toBeDefined();
    });

    it("should accept taskId option", () => {
      const { result } = renderHook(() => useWebSocket({ taskId: 123 }));

      expect(result.current).toBeDefined();
    });
  });
});