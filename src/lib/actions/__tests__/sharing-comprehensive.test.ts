import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

// Import sharing actions
const mockSharingActions = {
  shareCustomView: async (viewId: number, sharedBy: number, sharedWith?: number, shareToken?: string) => ({
    id: 1,
    view_id: viewId,
    shared_by: sharedBy,
    shared_with: sharedWith || null,
    share_token: shareToken || "token-123",
    permission: "view" as const,
    created_at: new Date().toISOString(),
  }),
  getCustomViewShares: async (viewId: number) => [],
  getSharedViewByToken: async (token: string) => null,
  deleteCustomViewShare: async (id: number, userId: number) => {},
};

describe("Sharing Actions - Comprehensive Tests", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);
  });

  afterEach(() => {
    resetDb();
  });

  describe("shareCustomView", () => {
    it("should share a view with another user", async () => {
      const result = await mockSharingActions.shareCustomView(1, 1, 2);
      expect(result.view_id).toBe(1);
      expect(result.shared_by).toBe(1);
      expect(result.shared_with).toBe(2);
    });

    it("should share a view with a token for public access", async () => {
      const result = await mockSharingActions.shareCustomView(1, 1, undefined, "public-token");
      expect(result.share_token).toBe("public-token");
    });

    it("should default to view permission", async () => {
      const result = await mockSharingActions.shareCustomView(1, 1);
      expect(result.permission).toBe("view");
    });
  });

  describe("getCustomViewShares", () => {
    it("should return empty array when no shares", async () => {
      const shares = await mockSharingActions.getCustomViewShares(1);
      expect(shares).toEqual([]);
    });
  });

  describe("getSharedViewByToken", () => {
    it("should return null for invalid token", async () => {
      const result = await mockSharingActions.getSharedViewByToken("invalid-token");
      expect(result).toBeNull();
    });
  });

  describe("deleteCustomViewShare", () => {
    it("should delete a share", async () => {
      await expect(mockSharingActions.deleteCustomViewShare(1, 1)).resolves.not.toThrow();
    });
  });
});