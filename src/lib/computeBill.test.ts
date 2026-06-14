import { describe, expect, it } from "vitest";

import { computeBill } from "./pricing";

// These mirror the backend gst_service.compute_bill so the POS can compute totals locally
// (no API call) and still post a grand total the server accepts byte-for-byte.

describe("computeBill — local cart calculations (CR-7 perf)", () => {
  it("single line: selling 200 × 3 @5% -> taxable 600, gst 30, grand 630 (exclusive)", () => {
    const { lines, totals } = computeBill([{ unitPrice: 200, quantity: 3, gstPercentage: 5 }]);
    expect(lines[0].taxable).toBe(600);
    expect(lines[0].gst).toBe(30);
    expect(lines[0].lineTotal).toBe(630);
    expect(totals.grandTotal).toBe(630);
  });

  it("intra-state split keeps cgst + sgst === gst", () => {
    const { totals } = computeBill([{ unitPrice: 200, quantity: 3, gstPercentage: 5 }], 0, "intra");
    expect(totals.cgst + totals.sgst).toBe(totals.gst);
    expect(totals.cgst).toBe(15);
    expect(totals.sgst).toBe(15);
    expect(totals.igst).toBe(0);
  });

  it("inter-state puts the whole GST in IGST", () => {
    const { totals } = computeBill([{ unitPrice: 200, quantity: 3, gstPercentage: 5 }], 0, "inter");
    expect(totals.igst).toBe(30);
    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
  });

  it("multi-line totals add up", () => {
    const { totals } = computeBill([
      { unitPrice: 200, quantity: 3, gstPercentage: 5 }, // 600 + 30
      { unitPrice: 50, quantity: 2, gstPercentage: 18 }, // 100 + 18
    ]);
    expect(totals.taxable).toBe(700);
    expect(totals.gst).toBe(48);
    expect(totals.grandTotal).toBe(748);
  });

  it("bill discount is apportioned across lines before GST", () => {
    // 100 discount over a single 600 line -> base 500, gst 25, grand 525.
    const { totals } = computeBill([{ unitPrice: 200, quantity: 3, gstPercentage: 5 }], 100);
    expect(totals.taxable).toBe(500);
    expect(totals.gst).toBe(25);
    expect(totals.grandTotal).toBe(525);
  });

  it("line discount reduces that line's taxable", () => {
    const { lines } = computeBill([{ unitPrice: 200, quantity: 3, gstPercentage: 5, discount: 60 }]);
    expect(lines[0].taxable).toBe(540); // 600 - 60
    expect(lines[0].gst).toBe(27);
    expect(lines[0].lineTotal).toBe(567);
  });

  it("is synchronous and pure — no network/promise (billing never hits the API)", () => {
    const result = computeBill([{ unitPrice: 10, quantity: 1, gstPercentage: 0 }]);
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.totals.grandTotal).toBe(10);
  });
});
