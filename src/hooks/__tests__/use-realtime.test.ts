import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRealtime } from "../use-realtime";

// Mock WebSocket constructor
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 1;
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = 3;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

describe("useRealtime Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock WebSocket
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Connection Management", () => {
    it("should be a function", () => {
      expect(typeof useRealtime).toBe('function');
    });

    it("should return connection state", () => {
      const { result } = renderHook(() => useRealtime());
      expect(result.current).toHaveProperty('connected');
      expect(result.current).toHaveProperty('connect');
      expect(result.current).toHaveProperty('disconnect');
    });

    it("should return subscription methods", () => {
      const { result } = renderHook(() => useRealtime());
      expect(result.current).toHaveProperty('subscribeToTask');
      expect(result.current).toHaveProperty('unsubscribeFromTask');
    });
  });
});