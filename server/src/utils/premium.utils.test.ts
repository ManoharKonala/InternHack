import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserTier, isPremiumUser } from "./premium.utils.js";
import { prisma } from "../database/db.js";
import { getPlanTier } from "../config/usage-limits.js";

vi.mock("../database/db.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../config/usage-limits.js", () => ({
  getPlanTier: vi.fn(),
}));

describe("premium.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserTier", () => {
    it("should return FREE if user is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      const tier = await getUserTier(1);
      expect(tier).toBe("FREE");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          subscriptionPlan: true,
          subscriptionStatus: true,
          subscriptionEndDate: true,
        },
      });
    });

    it("should return the tier from getPlanTier if user is found", async () => {
      const mockUser = {
        subscriptionPlan: "pro",
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(),
      };
      // @ts-ignore - partial mock
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser);
      vi.mocked(getPlanTier).mockReturnValueOnce("PREMIUM");

      const tier = await getUserTier(2);
      expect(tier).toBe("PREMIUM");
      expect(getPlanTier).toHaveBeenCalledWith(
        mockUser.subscriptionPlan,
        mockUser.subscriptionStatus,
        mockUser.subscriptionEndDate
      );
    });
  });

  describe("isPremiumUser", () => {
    it("should return true if getUserTier returns PREMIUM", async () => {
      // @ts-ignore
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({});
      vi.mocked(getPlanTier).mockReturnValueOnce("PREMIUM");
      
      const isPremium = await isPremiumUser(3);
      expect(isPremium).toBe(true);
    });

    it("should return false if getUserTier returns FREE", async () => {
      // @ts-ignore
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({});
      vi.mocked(getPlanTier).mockReturnValueOnce("FREE");
      
      const isPremium = await isPremiumUser(4);
      expect(isPremium).toBe(false);
    });
  });
});
