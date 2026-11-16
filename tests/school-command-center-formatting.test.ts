import { describe, expect, it } from "vitest";
import {
  formatDateTimeInTimeZone,
  formatOrganizationCurrency,
  getDateKeyInTimeZone,
} from "@/app/school/command-center-formatting";

describe("School command center organization formatting", () => {
  it("uses the tenant timezone for calendar-day boundaries", () => {
    expect(
      getDateKeyInTimeZone(
        new Date("2026-10-17T21:30:00.000Z"),
        "Africa/Kampala",
      ),
    ).toBe("2026-10-18");
  });

  it("formats timestamps and currencies using tenant preferences", () => {
    expect(
      formatDateTimeInTimeZone(
        "2026-10-17T12:00:00.000Z",
        "Africa/Kampala",
        "en-UG",
      ),
    ).not.toContain("Invalid");
    expect(
      formatOrganizationCurrency(12345.67, "USD", "en-US"),
    ).toContain("12,345.67");
  });

  it("rejects invalid timezone and balance data", () => {
    expect(() =>
      getDateKeyInTimeZone(new Date(), "not-a-timezone"),
    ).toThrow();
    expect(() =>
      formatOrganizationCurrency("not-a-number", "UGX", "en-UG"),
    ).toThrow(/invalid balance/);
  });
});
