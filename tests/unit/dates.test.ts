import { describe, expect, it } from "vitest"
import { addMembershipMonths, membershipStatus, suggestedRenewalStart } from "@/lib/dates"

describe("membership dates", () => {
  it("calculates an inclusive monthly expiration", () => {
    expect(addMembershipMonths("2026-09-11", 1)).toBe("2026-10-10")
  })

  it("clamps end-of-month memberships safely", () => {
    expect(addMembershipMonths("2026-01-31", 1)).toBe("2026-02-27")
    expect(addMembershipMonths("2024-01-31", 1)).toBe("2024-02-28")
  })

  it("classifies active, expiring, and expired memberships", () => {
    expect(membershipStatus("2026-10-01", "2026-09-11")).toBe("active")
    expect(membershipStatus("2026-09-25", "2026-09-11")).toBe("expiring")
    expect(membershipStatus("2026-09-10", "2026-09-11")).toBe("expired")
  })

  it("starts active renewals after current expiry and expired renewals today", () => {
    expect(suggestedRenewalStart("2026-10-10", "2026-09-11")).toBe("2026-10-11")
    expect(suggestedRenewalStart("2026-09-01", "2026-09-11")).toBe("2026-09-11")
  })
})
