import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BEFREE_FEE_RATE, standardTalentAmount } from "../lib/pricing.js";

describe("pricing", () => {
  test("標準手数料率は40%で確定している", () => {
    assert.equal(BEFREE_FEE_RATE, 0.4);
  });

  test("標準料率での人材支払額は企業請求額の60%", () => {
    assert.equal(standardTalentAmount(500000), 300000);
  });

  test("端数は四捨五入する", () => {
    assert.equal(standardTalentAmount(100001), 60001); // 100001 * 0.6 = 60000.6 → 60001
  });
});
